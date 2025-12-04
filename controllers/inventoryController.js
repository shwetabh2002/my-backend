const inventoryService = require('../services/inventoryService');
const multer = require('multer');
const xlsx = require('xlsx');
// const { createError } = require('../utils/apiError');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.'));
    }
  }
});

class InventoryController {
  // Create new inventory item
  createInventory = async (req, res) => {
    try {
      const inventoryData = req.body;
      const currentUser = req.user;
      const { companyId } = req.query;

      const inventory = await inventoryService.createInventory(inventoryData, currentUser, companyId);

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: inventory
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Create inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get all inventory items with pagination and filters
  getInventoryItems = async (req, res) => {
    try {
      const { companyId } = req.query;
      const filters = {
        type: req.query.type,
        category: req.query.category,
        brand: req.query.brand,
        condition: req.query.condition,
        model: req.query.model,
        year: req.query.year,
        search: req.query.search,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        inStock: req.query.inStock === 'true' ? true : req.query.inStock === 'false' ? false : undefined
      };

      const paginationOptions = {
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await inventoryService.getInventoryItems(filters, paginationOptions, companyId);

      res.status(200).json({
        success: true,
        message: 'Inventory items retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get inventory items error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get inventory item by ID
  getInventoryItemById = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { companyId } = req.query;

      const item = await inventoryService.getInventoryItemById(itemId, companyId);

      res.status(200).json({
        success: true,
        message: 'Inventory item retrieved successfully',
        data: item
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Get inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Update inventory item
  updateInventoryItem = async (req, res) => {
    try {
      const { itemId } = req.params;
      const updateData = req.body;
      const currentUser = req.user;
      const { companyId } = req.query;

      const updatedItem = await inventoryService.updateInventoryItem(itemId, updateData, currentUser, companyId);

      res.status(200).json({
        success: true,
        message: 'Inventory item updated successfully',
        data: updatedItem
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Update inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Delete inventory item
  deleteInventoryItem = async (req, res) => {
    try {
      const { itemId } = req.params;
      const currentUser = req.user;

      const result = await inventoryService.deleteInventoryItem(itemId, currentUser);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Delete inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Update stock quantity
  updateStock = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity, operation } = req.body;
      const currentUser = req.user;

      const updatedItem = await inventoryService.updateStock(itemId, quantity, operation, currentUser);

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: updatedItem
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Update stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get inventory statistics
  getInventoryStats = async (req, res) => {
    try {
      const currentUser = req.user;
      const { companyId } = req.query;

      const stats = await inventoryService.getInventoryStats(currentUser, companyId);

      res.status(200).json({
        success: true,
        message: 'Inventory statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get inventory stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Search inventory items
  searchInventory = async (req, res) => {
    try {
      const { query, limit } = req.query;
      const { companyId } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          statusCode: 400
        });
      }

      const items = await inventoryService.searchInventory(query, parseInt(limit) || 10, companyId);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: items
      });
    } catch (error) {
      console.error('Search inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get low stock alerts
  getLowStockAlerts = async (req, res) => {
    try {
      const { threshold } = req.query;
      const { companyId } = req.query;
      const alertThreshold = parseInt(threshold) || 10;

      const alerts = await inventoryService.getLowStockAlerts(alertThreshold, companyId);

      res.status(200).json({
        success: true,
        message: 'Low stock alerts retrieved successfully',
        data: alerts
      });
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };
  getInventorycategory = async (req, res) => {
    try {
      const { 
        category, 
        brand, 
        model, 
        year, 
        type, 
        color, 
        interiorColor,
        currencyType,
        page = 1,
        limit = 100
      } = req.query;
      
      const { companyId } = req.query;
      const filters = {};
      if(category) filters.category = category;
      if(brand) filters.brand = brand;
      if(model) filters.model = model;
      if(year) filters.year = year;
      if(type) filters.type = type;
      if(color) filters.color = color;
      if(interiorColor) filters.interiorColor = interiorColor;
      
      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 1000) // Max 1000 items per page
      };
      
      const items = await inventoryService.getInventorycategory(filters, currencyType, options, companyId);
      
      res.status(200).json({
        success: true,
        message: 'Inventory category retrieved successfully',
        data: items
      });
    } catch (error) {
      console.error('Get inventory category error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get inventory with comprehensive filtering
  getInventory = async (req, res) => {
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
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        search,
        type,
        category,
        subcategory,
        brand,
        model,
        year: year ? parseInt(year) : undefined,
        color,
        condition,
        status,
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minQuantity: minQuantity ? parseInt(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : undefined,
        createdBy,
        sortBy,
        sortOrder
      };

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100) // Max 100 items per page
      };

      const { companyId } = req.query;
      const result = await inventoryService.getInventory(filters, options, companyId);

      res.status(200).json({
        success: true,
        message: 'Inventory retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Bulk upload inventory items from Excel file
  bulkUploadInventory = async (req, res) => {
    try {
      // Handle multer errors
      if (req.fileValidationError) {
        return res.status(400).json({
          success: false,
          message: req.fileValidationError,
          statusCode: 400
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please upload an Excel file.',
          statusCode: 400
        });
      }

      const currentUser = req.user;
      const file = req.file;

      // Parse Excel file
      let workbook;
      try {
        workbook = xlsx.read(file.buffer, { type: 'buffer' });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Failed to parse Excel file. Please ensure the file is a valid Excel format.',
          statusCode: 400
        });
      }

      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const rawData = xlsx.utils.sheet_to_json(worksheet, { raw: false });

      if (!rawData || rawData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty or has no data rows.',
          statusCode: 400
        });
      }

      // Map Excel columns to inventory fields
      const itemsData = rawData.map((row, index) => {
        const item = {};

        // Map common fields (case-insensitive matching)
        const fieldMapping = {
          'name': ['name', 'product name', 'item name'],
          'type': ['type', 'product type'],
          'category': ['category'],
          'subcategory': ['subcategory', 'sub category'],
          'brand': ['brand', 'manufacturer'],
          'model': ['model'],
          'year': ['year'],
          'color': ['color', 'exterior color'],
          'interiorColor': ['interior color', 'interiorcolor'],
          'description': ['description', 'desc'],
          'costPrice': ['cost price', 'costprice', 'cost'],
          'sellingPrice': ['selling price', 'sellingprice', 'price'],
          'quantity': ['quantity', 'qty', 'stock'],
          'sku': ['sku', 'stock keeping unit']
        };

        // Helper function to find value by multiple possible column names
        const getValue = (fieldNames) => {
          for (const fieldName of fieldNames) {
            // Try exact match first
            if (row[fieldName] !== undefined) {
              return row[fieldName];
            }
            // Try case-insensitive match (also handle " (Mandatory)" and " (Optional)" suffixes)
            const foundKey = Object.keys(row).find(key => {
              const normalizedKey = key.toLowerCase().trim().replace(/\s*\(mandatory\)\s*/gi, '').replace(/\s*\(optional\)\s*/gi, '');
              const normalizedFieldName = fieldName.toLowerCase().trim();
              return normalizedKey === normalizedFieldName;
            });
            if (foundKey) {
              return row[foundKey];
            }
          }
          return undefined;
        };

        // Map each field
        Object.keys(fieldMapping).forEach(field => {
          const value = getValue(fieldMapping[field]);
          if (value !== undefined && value !== null && value !== '') {
            // Convert types
            if (field === 'year' || field === 'quantity') {
              item[field] = parseInt(value) || 0;
            } else if (field === 'costPrice' || field === 'sellingPrice') {
              item[field] = parseFloat(value) || 0;
            } else if (field === 'inStock') {
              item[field] = value === true || value === 'true' || value === 'yes' || value === '1' || value === 1;
            } else {
              item[field] = String(value).trim();
            }
          }
        });

        // Handle VIN numbers - can be comma-separated or in separate columns
        const vinNumbers = [];
        const vinStatus = getValue(['vin status', 'vinstatus']) || 'active';
        
        // Check for vinNumber column (comma-separated)
        const vinNumberValue = getValue(['vin number', 'vinnumber', 'chassis number', 'chassisnumber', 'chasis number']);
        if (vinNumberValue) {
          const vinList = String(vinNumberValue).split(',').map(v => v.trim()).filter(v => v);
          vinList.forEach(vin => {
            vinNumbers.push({
              status: vinStatus,
              chasisNumber: vin
            });
          });
        }

        // Check for multiple VIN columns (vin1, vin2, etc.)
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase().trim();
          if (lowerKey.startsWith('vin') || lowerKey.startsWith('chassis') || lowerKey.startsWith('chasis')) {
            const vinValue = String(row[key]).trim();
            if (vinValue && !vinNumbers.some(v => v.chasisNumber === vinValue)) {
              vinNumbers.push({
                status: vinStatus,
                chasisNumber: vinValue
              });
            }
          }
        });

        if (vinNumbers.length > 0) {
          item.vinNumber = vinNumbers;
        }

        // Handle dimensions - always set defaults to 0 if not provided
        const dimensions = {
          length: 0,
          width: 0,
          height: 0,
          weight: 0
        };
        
        const length = getValue(['length', 'dimension length']);
        const width = getValue(['width', 'dimension width']);
        const height = getValue(['height', 'dimension height']);
        const weight = getValue(['weight', 'dimension weight']);

        if (length) dimensions.length = parseFloat(length) || 0;
        if (width) dimensions.width = parseFloat(width) || 0;
        if (height) dimensions.height = parseFloat(height) || 0;
        if (weight) dimensions.weight = parseFloat(weight) || 0;
        
        item.dimensions = dimensions;

        // Set defaults (only for fields that are set by code)
        if (item.inStock === undefined) item.inStock = true;
        if (!item.condition) item.condition = 'new';
        if (!item.status) item.status = 'active';

        return item;
      }).filter(item => {
        // Filter out rows that don't have all required fields
        return item.name && item.type && item.category && item.subcategory && 
               item.brand && item.model && item.year && item.color && 
               item.interiorColor && item.description && item.costPrice && 
               item.sellingPrice && item.quantity !== undefined && item.vinNumber && 
               item.vinNumber.length > 0;
      });

      if (itemsData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid inventory items found in the Excel file. Please ensure all required fields (name, type, category, subcategory, brand, model, year, color, interior color, description, cost price, selling price, quantity, VIN number) are present.',
          statusCode: 400
        });
      }

      // Call bulk create service
      const { companyId } = req.query;
      const results = await inventoryService.bulkCreateInventory(itemsData, currentUser, companyId);

      // Determine response status
      const statusCode = results.failed.length === 0 ? 201 : 207; // 207 Multi-Status

      res.status(statusCode).json({
        success: results.failed.length === 0,
        message: `Bulk upload completed. ${results.success.length} items created successfully${results.failed.length > 0 ? `, ${results.failed.length} items failed` : ''}.`,
        data: {
          total: results.total,
          successful: results.success.length,
          failed: results.failed.length,
          successItems: results.success,
          failedItems: results.failed
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Bulk upload inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };
}

// Export both the controller instance and the upload middleware
module.exports = new InventoryController();
module.exports.upload = upload;
