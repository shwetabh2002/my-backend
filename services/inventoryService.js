const Inventory = require('../models/Inventory');
const Quotation = require('../models/quotation');
const { getPaginationOptions, createPaginationResponse } = require('../utils/pagination');
const { createError } = require('../utils/apiError');
const currencyService = require('./currencyService');

class InventoryService {
  // Create new inventory item
  async createInventory(inventoryData, currentUser) {
    try {
      // Auto-generate SKU if not provided
      if (!inventoryData.sku) {
        inventoryData.sku = await this.generateSKU(inventoryData);
      } else {
        // Check if provided SKU already exists
        const existingItem = await Inventory.findOne({ sku: inventoryData.sku });
        if (existingItem) {
          throw createError.conflict('SKU already exists');
        }
      }

      // Auto-generate tags from name and description
      inventoryData.tags = this.generateTags(inventoryData);

      // Set audit fields
      inventoryData.createdBy = currentUser._id;
      inventoryData.updatedBy = currentUser._id;

      // Create inventory item
      const inventory = await Inventory.create(inventoryData);
      
      // Populate creator, updater, and supplier info
      await inventory.populate('createdBy', 'name email');
      await inventory.populate('updatedBy', 'name email');
      await inventory.populate('supplierId', 'name email custId');

      return inventory;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      throw error;
    }
  }

  // Generate SKU automatically
  async generateSKU(inventoryData) {
    const { type, brand, model, year } = inventoryData;
    
    // Sanitize function: remove/replace invalid characters
    // Only allow uppercase letters, numbers, and hyphens
    const sanitize = (str) => {
      if (!str) return '';
      return str
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '-') // Replace invalid chars with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };
    
    // Create base SKU
    let baseSKU = '';
    
    if (type === 'car') {
      baseSKU = `CAR-${sanitize(brand)}`;
      if (model) baseSKU += `-${sanitize(model)}`;
      if (year) baseSKU += `-${year}`;
    } else {
      baseSKU = `PART-${sanitize(brand)}`;
      if (model) baseSKU += `-${sanitize(model)}`;
      if (year) baseSKU += `-${year}`;
    }
    
    // Add sequence number to ensure uniqueness
    let counter = 1;
    let sku = `${baseSKU}-${counter.toString().padStart(3, '0')}`;
    
    // Check if SKU exists and increment counter
    while (await Inventory.findOne({ sku })) {
      counter++;
      sku = `${baseSKU}-${counter.toString().padStart(3, '0')}`;
    }
    
    return sku;
  }

  // Generate tags from name and description
  generateTags(inventoryData) {
    const { name, description, brand, category, subcategory, model, year, color } = inventoryData;
    const tags = new Set();
    
    // Add brand and category as base tags
    if (brand) tags.add(brand.toLowerCase());
    if (category) tags.add(category.toLowerCase());
    if (subcategory) tags.add(subcategory.toLowerCase());
    
    // Extract words from name
    if (name) {
      const nameWords = name.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove special characters
        .split(/\s+/)
        .filter(word => word.length > 2); // Filter out short words
      nameWords.forEach(word => tags.add(word));
    }
    
    // Extract words from description
    if (description) {
      const descWords = description.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove special characters
        .split(/\s+/)
        .filter(word => word.length > 2) // Filter out short words
        .filter(word => !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were'].includes(word)); // Filter common words
      descWords.forEach(word => tags.add(word));
    }
    
    // Add specific fields as tags
    if (model) tags.add(model.toLowerCase());
    if (year) tags.add(year.toString());
    if (color) tags.add(color.toLowerCase());
    
    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  // Get all inventory items with pagination and filters
  async getInventoryItems(filters = {}, paginationOptions = {}) {
    try {
      const { page, limit, sortBy, sortOrder } = getPaginationOptions(paginationOptions);
      
      // Build filter query
      const query = {};
      
      if (filters.type) query.type = filters.type;
      if (filters.category) query.category = filters.category;
      if (filters.brand) query.brand = filters.brand;
      if (filters.condition) query.condition = filters.condition;
      if (filters.status) query.status = filters.status;
      if (filters.location) query.location = filters.location;
      if  (filters.model) query.model = filters.model;
      if (filters.year) query.year = filters.year;
      // Text search
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { sku: { $regex: filters.search, $options: 'i' } },
          { brand: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Price range filter
      if (filters.minPrice || filters.maxPrice) {
        query.sellingPrice = {};
        if (filters.minPrice) query.sellingPrice.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice) query.sellingPrice.$lte = parseFloat(filters.maxPrice);
      }

      // Stock filter
      if (filters.inStock !== undefined) {
        if (filters.inStock) {
          query.quantity = { $gt: 0 };
        } else {
          query.quantity = { $lte: 0 };
        }
      }

      // Build sort options
      const sortOptions = {};
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = -1; // Default sort by creation date
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      
      const [items, total] = await Promise.all([
        Inventory.find(query)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .populate('supplierId', 'name email custId')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Inventory.countDocuments(query)
      ]);

      return createPaginationResponse(items, total, page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get inventory item by ID
  async getInventoryItemById(itemId) {
    try {
      const item = await Inventory.findById(itemId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('supplierId', 'name email custId')
        .lean();

      if (!item) {
        throw createError.notFound('Inventory item not found');
      }

      // Get quotation information for VIN numbers with 'hold' status
      if (item.vinNumber && item.vinNumber.length > 0) {
        // console.log('Total VIN numbers:', item.vinNumber.length);
        // console.log('All VIN numbers:', item.vinNumber);
        
        const holdVinNumbers = item.vinNumber.filter(vin => vin.status !== 'active');
        // console.log('Hold VIN numbers found:', holdVinNumbers.length);
        // console.log('Hold VIN numbers:', holdVinNumbers);
        
        let quotations = [];
        if (holdVinNumbers.length > 0) {
          const chassisNumbers = holdVinNumbers.map(vin => vin.chasisNumber);
          // console.log('Chassis numbers to search:', chassisNumbers);
          
          // Since chassis numbers are unique, we can directly find quotations by chassis number
          quotations = await Quotation.find({
            'items.vinNumbers.chasisNumber': { $in: chassisNumbers },
            status:{$ne:'rejected'}
          }).select('quotationId quotationNumber status createdAt customer.name items.vinNumbers bookingAmount');

          // console.log('Found quotations:', quotations.length);
          if (quotations.length > 0) {
            console.log('Sample quotation structure:', JSON.stringify(quotations[0], null, 2));
          }
        }

        // Always process VIN numbers to convert them to plain objects
        item.vinNumber = item.vinNumber.map(vin => {
          // console.log('Processing VIN:', vin.chasisNumber, 'Status:', vin.status);
          
          if (vin.status !== 'active' && quotations.length > 0) {
            // Find the quotation that contains this chassis number
            const quotation = quotations.find(quotation => 
              quotation.items.some(item => 
                item.vinNumbers.some(v => v.chasisNumber === vin.chasisNumber)
              )
            );
            
            // console.log('Quotation found for VIN:', vin.chasisNumber, 'Quotation:', quotation ? 'YES' : 'NO');
            
            if (quotation) {
              // console.log('Adding quotation to VIN:', vin.chasisNumber);
              const vinWithQuotation = {
                status: vin.status,
                chasisNumber: vin.chasisNumber,
                _id: vin._id,
                quotation: {
                  quotationId: quotation.quotationId,
                  quotationNumber: quotation.quotationNumber,
                  status: quotation.status,
                  createdAt: quotation.createdAt,
                  customerName: quotation.customer?.name
                }
              };
              // console.log('VIN with quotation:', JSON.stringify(vinWithQuotation, null, 2));
              return vinWithQuotation;
            }
          }
          
          // Convert all VIN numbers to plain objects
          return {
            status: vin.status,
            chasisNumber: vin.chasisNumber,
            _id: vin._id
          };
        });
        
        // console.log('Final VIN numbers after mapping:', JSON.stringify(item.vinNumber, null, 2));
      }

      return item;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw error;
    }
  }

  // Update inventory item
  async updateInventoryItem(itemId, updateData, currentUser) {
    try {
      // Check if item exists
      const existingItem = await Inventory.findById(itemId);
      if (!existingItem) {
        throw createError.notFound('Inventory item not found');
      }

      // Check if SKU is being updated and if it already exists
      if (updateData.sku && updateData.sku !== existingItem.sku) {
        const skuExists = await Inventory.findOne({ 
          sku: updateData.sku, 
          _id: { $ne: itemId } 
        });
        if (skuExists) {
          throw createError.conflict('SKU already exists');
        }
      }

      // Set audit fields
      updateData.updatedBy = currentUser._id;
      updateData.updatedAt = new Date();

      // Update item
      const updatedItem = await Inventory.findByIdAndUpdate(
        itemId,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email')
       .populate('supplierId', 'name email custId');

      return updatedItem;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      throw error;
    }
  }

  // Delete inventory item
  async deleteInventoryItem(itemId, currentUser) {
    try {
      const item = await Inventory.findById(itemId);
      if (!item) {
        throw createError.notFound('Inventory item not found');
      }

      // Check if item can be deleted (e.g., no active orders)
      if (item.quantity > 0) {
        throw createError.forbidden('Cannot delete item with existing stock');
      }

      await Inventory.findByIdAndDelete(itemId);
      
      return { message: 'Inventory item deleted successfully' };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw error;
    }
  }

  // Update stock quantity
  async updateStock(itemId, quantity, operation = 'add', currentUser) {
    try {
      const item = await Inventory.findById(itemId);
      if (!item) {
        throw createError.notFound('Inventory item not found');
      }

      let newQuantity;
      switch (operation) {
        case 'add':
          newQuantity = item.quantity + quantity;
          break;
        case 'subtract':
          newQuantity = item.quantity - quantity;
          if (newQuantity < 0) {
            throw createError.badRequest('Insufficient stock');
          }
          break;
        case 'set':
          newQuantity = quantity;
          if (newQuantity < 0) {
            throw createError.badRequest('Quantity cannot be negative');
          }
          break;
        default:
          throw createError.badRequest('Invalid operation. Use: add, subtract, or set');
      }

      const updatedItem = await Inventory.findByIdAndUpdate(
        itemId,
        { 
          quantity: newQuantity,
          updatedBy: currentUser._id,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email')
       .populate('supplierId', 'name email custId');

      return updatedItem;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      throw error;
    }
  }

  // Get inventory statistics
  async getInventoryStats(currentUser) {
    try {
      const stats = await Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
            totalCost: { $sum: { $multiply: ['$costPrice', '$quantity'] } },
            lowStockItems: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', 10] }] },
                  1,
                  0
                ]
              }
            },
            outOfStockItems: {
              $sum: {
                $cond: [{ $lte: ['$quantity', 0] }, 1, 0]
              }
            }
          }
        }
      ]);

      // Get category breakdown
      const categoryStats = await Inventory.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get type breakdown
      const typeStats = await Inventory.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } }
          }
        }
      ]);

      return {
        overview: stats[0] || {
          totalItems: 0,
          totalValue: 0,
          totalCost: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        },
        categoryBreakdown: categoryStats,
        typeBreakdown: typeStats
      };
    } catch (error) {
      throw error;
    }
  }

  // Search inventory items
  async searchInventory(query, limit = 10) {
    try {
      const items = await Inventory.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { sku: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      })
      .select('name sku brand category quantity sellingPrice images')
      .limit(limit)
      .sort({ quantity: -1 }); // Prioritize items with stock

      return items;
    } catch (error) {
      throw error;
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(threshold = 10) {
    try {
      const lowStockItems = await Inventory.find({
        quantity: { $gt: 0, $lte: threshold }
      })
      .select('name sku category quantity sellingPrice location')
      .sort({ quantity: 1 });

      return lowStockItems;
    } catch (error) {
      throw error;
    }
  }

  async getInventorycategory(filters, currencyType = 'USD', options = {}) {
    try {
      
      // Pagination options
      const { page = 1, limit = 100 } = options;
      const skip = (page - 1) * limit;
      
      // Build the query based on filters
      const query = {};
      
      if (filters.category) query.category = filters.category;
      if (filters.brand) query.brand = filters.brand;
      if (filters.model) query.model = filters.model;
      if (filters.year) query.year = filters.year;
      if (filters.color) query.color = filters.color;
      if (filters.interiorColor) query.interiorColor = filters.interiorColor;
      if (filters.type) query.type = filters.type;
      
      // Always filter for items in stock
      query.quantity = { $gt: 0 };
      query.type = 'car';
      query.status = 'active';
      
      // Get total count for pagination
      const totalItems = await Inventory.countDocuments(query);
      
      // Get paginated items
      const items = await Inventory.find(query)
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get exchange rate once for all items
      let exchangeRate = 1.0;
      if (currencyType && currencyType.toUpperCase() !== 'USD') {
        try {
          exchangeRate = await currencyService.getExchangeRate(currencyType);
        } catch (error) {
          console.error('Currency conversion error:', error.message);
          exchangeRate = 1.0;
        }
      }
      
      // Convert prices efficiently and filter vinNumber array
      const convertedItems = items.map(item => {
        const originalPrice = item.sellingPrice || 0;
        const convertedPrice = Math.round(originalPrice * exchangeRate * 100) / 100;
        
        // Filter vinNumber array to only include active status items
        const activeVinNumbers = item.vinNumber ? 
          item.vinNumber.filter(vin => vin.status === 'active') : [];
        
        return {
          ...item,
          vinNumber: activeVinNumbers, // Only return active VIN numbers
          currencyType: currencyType.toUpperCase(),
          newSellingPrice: convertedPrice
        };
      });
      
      // Get summary data efficiently (only from current page for performance)
      const categories = [...new Set(items.map(item => item.category).filter(Boolean))];
      const brands = [...new Set(items.map(item => item.brand).filter(Boolean))];
      const models = [...new Set(items.map(item => item.model).filter(Boolean))];
      const years = [...new Set(items.map(item => item.year).filter(Boolean))];
      const colors = [...new Set(items.map(item => item.color).filter(Boolean))];
      const interiorColors = [...new Set(items.map(item => item.interiorColor).filter(Boolean))];
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalItems / limit);
      
      return {
        items: convertedItems,
        summary: {
          category: categories,
          brand: brands,
          model: models,
          year: years,
          color: colors,
          interiorColor: interiorColors
        },
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        currencyInfo: {
          currency: currencyType.toUpperCase(),
          exchangeRate: exchangeRate,
          baseCurrency: 'USD'
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get inventory with comprehensive filtering, search, and pagination
   * @param {Object} filters - Filter options
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Paginated inventory results
   */
  async getInventory(filters = {}, options = {}) {
    try {
      const {
        search,
        type,
        category,
        subcategory,
        brand,
        model,
        year,
        color,
        interiorColor,
        condition,
        status,
        inStock,
        minPrice,
        maxPrice,
        minQuantity,
        maxQuantity,
        createdBy,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const {
        page = 1,
        limit = 20
      } = options;

      // Build query
      const query = {};

      // Search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
        ];
      }

      // Basic filters (case-insensitive for string fields)
      if (type) query.type = { $regex: new RegExp(`^${type}$`, 'i') };
      if (category) query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      if (subcategory) query.subcategory = { $regex: new RegExp(`^${subcategory}$`, 'i') };
      if (brand) query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
      if (model) query.model = { $regex: new RegExp(`^${model}$`, 'i') };
      if (year) query.year = year;
      if (color) query.color = { $regex: new RegExp(`^${color}$`, 'i') };
      if (interiorColor) query.interiorColor = { $regex: new RegExp(`^${interiorColor}$`, 'i') };
      if (condition) query.condition = { $regex: new RegExp(`^${condition}$`, 'i') };
      if (status) query.status = { $regex: new RegExp(`^${status}$`, 'i') };
      if (createdBy) query.createdBy = createdBy;

      // Boolean filters
      if (inStock !== undefined) {
        if (inStock === true) {
          query.quantity = { $gt: 0 };
          query.inStock = true;
        } else {
          query.$or = [
            { quantity: { $lte: 0 } },
            { inStock: false }
          ];
        }
      }

      // Price range filters
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.sellingPrice = {};
        if (minPrice !== undefined) query.sellingPrice.$gte = minPrice;
        if (maxPrice !== undefined) query.sellingPrice.$lte = maxPrice;
      }

      // Quantity range filters
      if (minQuantity !== undefined || maxQuantity !== undefined) {
        query.quantity = query.quantity || {};
        if (minQuantity !== undefined) query.quantity.$gte = minQuantity;
        if (maxQuantity !== undefined) query.quantity.$lte = maxQuantity;
      }



      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get total count for pagination
      const totalItems = await Inventory.countDocuments(query);

      // Get paginated results
      const items = await Inventory.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('supplierId', 'name email custId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get summary data for filters
      const summary = await this.getInventorySummary(query);

      // Calculate pagination info
      const totalPages = Math.ceil(totalItems / limit);

      return {
        items,
        summary,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          applied: filters,
          available: summary
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get summary data for inventory filters
   * @param {Object} baseQuery - Base query to filter summary data
   * @returns {Promise<Object>} Summary data for filters
   */
  async getInventorySummary(baseQuery = {}) {
    try {
      // Get all inventory items with minimal data - much faster than aggregation
      const items = await Inventory.find(baseQuery)
        .select('type category subcategory brand model year color interiorColor condition status location.warehouse tags')
        .lean();

      // Calculate summary in JavaScript - much faster
      const types = [...new Set(items.map(item => item.type?.toLowerCase()).filter(Boolean))];
      const categories = [...new Set(items.map(item => item.category?.toLowerCase()).filter(Boolean))];
      const subcategories = [...new Set(items.map(item => item.subcategory?.toLowerCase()).filter(Boolean))];
      const brands = [...new Set(items.map(item => item.brand?.toLowerCase()).filter(Boolean))];
      const models = [...new Set(items.map(item => item.model?.toLowerCase()).filter(Boolean))];
      const years = [...new Set(items.map(item => item.year).filter(Boolean))];
      const colors = [...new Set(items.map(item => item.color?.toLowerCase()).filter(Boolean))];
      const interiorColors = [...new Set(items.map(item => item.interiorColor?.toLowerCase()).filter(Boolean))];
      const conditions = [...new Set(items.map(item => item.condition?.toLowerCase()).filter(Boolean))];
      const statuses = [...new Set(items.map(item => item.status?.toLowerCase()).filter(Boolean))];
      const warehouses = [...new Set(items.map(item => item.location?.warehouse?.toLowerCase()).filter(Boolean))];
      
      // Flatten and process tags
      const allTags = [...new Set(
        items.flatMap(item => 
          (item.tags || []).map(tag => tag?.toLowerCase()).filter(Boolean)
        )
      )];

      return {
        types,
        categories,
        subcategories,
        brands,
        models,
        years,
        colors,
        interiorColors,
        conditions,
        statuses,
        warehouses,
        allTags
      };
    } catch (error) {
      throw error;
    }
  }
}
module.exports = new InventoryService();
