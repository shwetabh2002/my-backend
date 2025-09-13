const Quotation = require('../models/quotation');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const Company = require('../models/Company');
const { createError } = require('../utils/apiError');

class QuotationService {
  /**
   * Create a new quotation
   * @param {Object} quotationData - Quotation data
   * @param {string} createdBy - User ID who created the quotation
   * @returns {Promise<Object>} Created quotation
   */
  async createQuotation(quotationData, createdBy) {
    try {
      console.log('Creating quotation for customer:', quotationData.custId);
      const status = 'draft';
      const statusHistory = [{
        status: status,
        date: new Date()
      }];
      const validTill = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); //3 days from now
  const quotationTotal = await Quotation.countDocuments() ||1;
  const year = new Date().getFullYear();
  const newNumber = quotationTotal + 1 ;

  quotationData.statusHistory = statusHistory;
  quotationData.validTill = validTill;
      // Validate customer exists
      const customer = await User.findOne({ 
        _id: quotationData.custId,
        type: 'customer'
      });

      if (!customer) {
        console.error('Customer not found:', quotationData.customer?.custId);
        throw createError.notFound('Customer not found');
      }

      console.log('Customer found:', customer.name);
const company = await Company.findOne();
quotationData.termsAndConditions=company.termCondition;
      // Set customer information from user data
      quotationData.customer = {
        userId: customer._id,
        custId: customer.custId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || customer.phone,
        address: customer.address || "no address"
      };
quotationData.deliveryAddress = customer.address 
      // Calculate line totals for each item
      if (quotationData.items && quotationData.items.length > 0) {
        // console.log('Processing items:', quotationData.items.length);
        quotationData.items = quotationData.items.map(item => {
          const totalPrice = item.quantity * item.sellingPrice;
          return {
            ...item,
            totalPrice: totalPrice
          };
        });
      }
      const totalVinNumbers = quotationData.items.map(item => item.vinNumbers.map(vin => vin.chasisNumber)).flat();
      // console.log('Vin numbers:', totalVinNumbers);

      // Calculate subtotal
      quotationData.subtotal = quotationData.items.reduce((total, item) => total + item.totalPrice, 0);

      // Map discount to totalDiscount and calculate
      const discountValue = quotationData.discount || 0;
      if (discountValue > 0) {
        if (quotationData.discountType === 'percentage') {
          // console.log('Calculating total discount:', discountValue, quotationData.discountType);
          quotationData.totalDiscount = (quotationData.subtotal * discountValue) / 100;
          // console.log('Calculated total discount:', quotationData.totalDiscount);
        } else {
          // console.log('Calculating total discount:', discountValue, quotationData.discountType);
          quotationData.totalDiscount = discountValue;
          // console.log('Calculated total discount:', quotationData.totalDiscount);
        }
      } else {
        quotationData.totalDiscount = 0;
      }

      // Calculate vat amount
      const taxableAmount = quotationData.subtotal - quotationData.totalDiscount;
      // console.log('Calculated taxable amount:', taxableAmount);
      quotationData.vatAmount = quotationData.VAT ? (taxableAmount * quotationData.VAT) / 100 : 0;
      // console.log('Calculated vat amount:', quotationData.vatAmount);

      // Calculate total amount
      quotationData.totalAmount = taxableAmount + quotationData.vatAmount;
      // console.log('Calculated total amount:', quotationData.totalAmount);
      // console.log('Calculated totals - Subtotal:', quotationData.subtotal, 'Total:', quotationData.totalAmount);
      const quotationNumber = `QUO-${year}-${String(newNumber).padStart(6, '0')}`;
      const quotationId = `QID-${year}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;


      const quotation = new Quotation({
        ...quotationData,
        createdBy,
        updatedBy: createdBy,
        quotationNumber: quotationNumber,
        quotationId: quotationId,
      });
      await this.updateInventoryForQuotation(quotationData.items);

      await quotation.save();
      console.log('Quotation saved successfully:', quotation.quotationId);
      
      // Update inventory based on quotation items

      // Populate references
      await quotation.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' },
        { path: 'customer.userId', select: 'name email' }
      ]);

      return quotation;
    } catch (error) {
      console.error('Error creating quotation:', {
        error: error.message,
        stack: error.stack,
        customerId: quotationData.customer?.custId,
        createdBy
      });

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        console.error('Validation errors:', errors);
        throw createError.badRequest(`Validation failed: ${errors.join(', ')}`);
      }

      if (error.name === 'MongoError' && error.code === 11000) {
        console.error('Duplicate key error:', error.keyValue);
        // If it's a quotationNumber duplicate, try to regenerate
        if (error.keyValue && error.keyValue.quotationNumber === null) {
          console.log('Retrying quotation creation due to null quotationNumber duplicate');
          // Remove the quotationNumber and quotationId to force regeneration
          delete quotationData.quotationNumber;
          delete quotationData.quotationId;
          // Retry once
          try {
            const retryQuotation = new Quotation({
              ...quotationData,
              createdBy,
              updatedBy: createdBy,
            });
            await retryQuotation.save();
            console.log('Quotation created successfully on retry:', retryQuotation.quotationId);
            return retryQuotation;
          } catch (retryError) {
            console.error('Retry failed:', retryError.message);
            throw createError.conflict('Failed to create quotation due to duplicate key error');
          }
        }
        throw createError.conflict('Quotation with this identifier already exists');
      }

      if (error.name === 'CastError') {
        console.error('Cast error:', error.message);
        throw createError.badRequest('Invalid data format provided');
      }

      // Re-throw custom API errors as-is
      if (error.isOperational) {
        throw error;
      }

      // For unexpected errors, throw a generic server error
      throw createError.internal('An unexpected error occurred while creating quotation');
    }
  }

  /**
   * Get all quotations with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, sort, etc.)
   * @returns {Promise<Object>} Paginated quotations
   */
  async getQuotations(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        search,
        status,
        customerId,
        createdBy,
        dateFrom,
        dateTo,
        validTillFrom,
        validTillTo
      } = options;

      // Build query
      const query = {};

      if (status) query.status = status;
      if (customerId) query['customer.custId'] = customerId;
      if (createdBy) query.createdBy = createdBy;

      // Date range filters
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (validTillFrom || validTillTo) {
        query.validTill = {};
        if (validTillFrom) query.validTill.$gte = new Date(validTillFrom);
        if (validTillTo) query.validTill.$lte = new Date(validTillTo);
      }

      // Search functionality
      if (search) {
        query.$or = [
          { quotationNumber: new RegExp(search, 'i') },
          { title: new RegExp(search, 'i') },
          { 'customer.name': new RegExp(search, 'i') },
          { 'customer.email': new RegExp(search, 'i') },
          { 'customer.custId': new RegExp(search, 'i') }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;
      const limitNum = parseInt(limit);

      // Execute query with pagination
      const quotations = await Quotation.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.inventoryId', 'name sku sellingPrice')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await Quotation.countDocuments(query);

      return {
        quotations,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: page < Math.ceil(total / limitNum),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw createError.internal('Failed to fetch quotations');
    }
  }

  /**
   * Get quotation by ID
   * @param {string} quotationId - Quotation ID
   * @returns {Promise<Object>} Quotation details
   */
  async getQuotationById(quotationId) {
    try {
      const quotation = await Quotation.findById(quotationId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.inventoryId', 'name sku sellingPrice description');

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Get quotation by quotation number
   * @param {string} quotationNumber - Quotation number
   * @returns {Promise<Object>} Quotation details
   */
  async getQuotationByNumber(quotationNumber) {
    try {
      const quotation = await Quotation.findOne({ quotationNumber })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.inventoryId', 'name sku sellingPrice description');

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      return quotation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update quotation
   * @param {string} quotationId - Quotation ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async updateQuotation(quotationId, updateData, updatedBy) {
    try {
      // Validate inventory items if being updated
      if (updateData.items && updateData.items.length > 0) {
        const inventoryIds = updateData.items.map(item => item.inventoryId);
        const inventoryItems = await Inventory.find({ _id: { $in: inventoryIds } });

        if (inventoryItems.length !== inventoryIds.length) {
          throw createError.badRequest('One or more inventory items not found');
        }

        // Update items with current inventory data
        updateData.items = updateData.items.map(item => {
          const inventoryItem = inventoryItems.find(inv => inv._id.toString() === item.inventoryId.toString());
          return {
            ...item,
            name: inventoryItem.name,
            description: inventoryItem.description,
            sku: inventoryItem.sku,
            unitPrice: item.unitPrice || inventoryItem.sellingPrice
          };
        });
      }

      const quotation = await Quotation.findByIdAndUpdate(
        quotationId,
        { 
          ...updateData, 
          updatedBy,
          lastActivityDate: new Date()
        },
        { 
          new: true, 
          runValidators: true 
        }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email')
       .populate('customer.userId', 'name email')
       .populate('items.inventoryId', 'name sku sellingPrice');

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete quotation
   * @param {string} quotationId - Quotation ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteQuotation(quotationId) {
    try {
      const quotation = await Quotation.findByIdAndDelete(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      return { message: 'Quotation deleted successfully' };
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Update quotation status
   * @param {string} quotationId - Quotation ID
   * @param {string} status - New status
   * @param {string} updatedBy - User ID who updated the status
   * @returns {Promise<Object>} Updated quotation
   */
  async updateQuotationStatus(quotationId, status, updatedBy) {
    try {
      const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'];
      
      if (!validStatuses.includes(status)) {
        throw createError.badRequest('Invalid status. Must be one of: ' + validStatuses.join(', '));
      }

      const quotation = await Quotation.findByIdAndUpdate(
        quotationId,
        { 
          status,
          updatedBy,
          lastActivityDate: new Date()
        },
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email')
       .populate('customer.userId', 'name email');

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Mark quotation as sent
   * @param {string} quotationId - Quotation ID
   * @param {string} updatedBy - User ID who sent the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async markAsSent(quotationId, updatedBy) {
    try {
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (quotation.status !== 'draft') {
        throw createError.badRequest('Only draft quotations can be marked as sent');
      }

      quotation.status = 'sent';
      quotation.sentAt = new Date();
      quotation.updatedBy = updatedBy;

      await quotation.save();

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Mark quotation as viewed
   * @param {string} quotationId - Quotation ID
   * @returns {Promise<Object>} Updated quotation
   */
  async markAsViewed(quotationId) {
    try {
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (quotation.status === 'sent') {
        quotation.status = 'viewed';
        quotation.viewedAt = new Date();
        await quotation.save();
      }

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Accept quotation
   * @param {string} quotationId - Quotation ID
   * @returns {Promise<Object>} Updated quotation
   */
  async acceptQuotation(quotationId) {
    try {
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (!['sent', 'viewed'].includes(quotation.status)) {
        throw createError.badRequest('Only sent or viewed quotations can be accepted');
      }

      quotation.status = 'accepted';
      quotation.respondedAt = new Date();

      await quotation.save();

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Reject quotation
   * @param {string} quotationId - Quotation ID
   * @returns {Promise<Object>} Updated quotation
   */
  async rejectQuotation(quotationId) {
    try {
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (!['sent', 'viewed'].includes(quotation.status)) {
        throw createError.badRequest('Only sent or viewed quotations can be rejected');
      }

      quotation.status = 'rejected';
      quotation.respondedAt = new Date();

      await quotation.save();

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Get quotations by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Customer quotations
   */
  async getQuotationsByCustomer(customerId, options = {}) {
    try {
      const { limit = 50 } = options;

      const quotations = await Quotation.findByCustomer(customerId)
        .populate('createdBy', 'name email')
        .populate('items.inventoryId', 'name sku sellingPrice')
        .limit(parseInt(limit))
        .sort('-createdAt')
        .lean();

      return quotations;
    } catch (error) {
      throw createError.internal('Failed to fetch customer quotations');
    }
  }

  /**
   * Get quotations by status
   * @param {string} status - Quotation status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Quotations with status
   */
  async getQuotationsByStatus(status, options = {}) {
    try {
      const { limit = 50 } = options;

      const quotations = await Quotation.findByStatus(status)
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.inventoryId', 'name sku sellingPrice')
        .limit(parseInt(limit))
        .sort('-createdAt')
        .lean();

      return quotations;
    } catch (error) {
      throw createError.internal('Failed to fetch quotations by status');
    }
  }

  /**
   * Get expired quotations
   * @returns {Promise<Array>} Expired quotations
   */
  async getExpiredQuotations() {
    try {
      const quotations = await Quotation.findExpired()
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email')
        .sort('-validTill')
        .lean();

      return quotations;
    } catch (error) {
      throw createError.internal('Failed to fetch expired quotations');
    }
  }

  /**
   * Get quotations expiring soon
   * @param {number} days - Days ahead to check (default: 3)
   * @returns {Promise<Array>} Quotations expiring soon
   */
  async getQuotationsExpiringSoon(days = 3) {
    try {
      const quotations = await Quotation.findExpiringSoon(days)
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email')
        .sort('validTill')
        .lean();

      return quotations;
    } catch (error) {
      throw createError.internal('Failed to fetch quotations expiring soon');
    }
  }

  /**
   * Search quotations
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchQuotations(searchTerm, options = {}) {
    try {
      const { limit = 20 } = options;

      const quotations = await Quotation.find({
        $or: [
          { quotationNumber: new RegExp(searchTerm, 'i') },
          { title: new RegExp(searchTerm, 'i') },
          { 'customer.name': new RegExp(searchTerm, 'i') },
          { 'customer.email': new RegExp(searchTerm, 'i') },
          { 'customer.custId': new RegExp(searchTerm, 'i') }
        ]
      })
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.inventoryId', 'name sku sellingPrice')
        .limit(parseInt(limit))
        .sort('-createdAt')
        .lean();

      return quotations;
    } catch (error) {
      throw createError.internal('Search failed');
    }
  }

  /**
   * Get quotation statistics
   * @returns {Promise<Object>} Quotation statistics
   */
  async getQuotationStats() {
    try {
      const stats = await Quotation.getQuotationStats();
      
      if (stats.length === 0) {
        return {
          totalQuotations: 0,
          totalValue: 0,
          byStatus: {},
          byMonth: {}
        };
      }

      const result = stats[0];
      
      // Process status stats
      const statusStats = {};
      result.byStatus.forEach(item => {
        if (!statusStats[item.status]) {
          statusStats[item.status] = { count: 0, value: 0 };
        }
        statusStats[item.status].count++;
        statusStats[item.status].value += item.amount;
      });

      // Process monthly stats
      const monthlyStats = {};
      result.byMonth.forEach(item => {
        const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
        if (!monthlyStats[key]) {
          monthlyStats[key] = { count: 0, value: 0 };
        }
        monthlyStats[key].count++;
        monthlyStats[key].value += item.amount;
      });

      return {
        totalQuotations: result.totalQuotations,
        totalValue: result.totalValue,
        byStatus: statusStats,
        byMonth: monthlyStats
      };
    } catch (error) {
      throw createError.internal('Failed to fetch quotation statistics');
    }
  }

  /**
   * Duplicate quotation
   * @param {string} quotationId - Original quotation ID
   * @param {string} createdBy - User ID who created the duplicate
   * @returns {Promise<Object>} Duplicated quotation
   */
  async duplicateQuotation(quotationId, createdBy) {
    try {
      const originalQuotation = await Quotation.findById(quotationId);

      if (!originalQuotation) {
        throw createError.notFound('Original quotation not found');
      }

      // Create duplicate with new quotation number
      const duplicateData = originalQuotation.toObject();
      delete duplicateData._id;
      delete duplicateData.quotationNumber;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      delete duplicateData.sentAt;
      delete duplicateData.viewedAt;
      delete duplicateData.respondedAt;
      delete duplicateData.expiresAt;

      duplicateData.status = 'draft';
      duplicateData.title = `Copy of ${originalQuotation.title}`;
      duplicateData.createdBy = createdBy;
      duplicateData.updatedBy = createdBy;

      const duplicate = new Quotation(duplicateData);
      await duplicate.save();

      await duplicate.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'customer.userId', select: 'name email' },
        { path: 'items.inventoryId', select: 'name sku sellingPrice' }
      ]);

      return duplicate;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Convert quotation to order/invoice
   * @param {string} quotationId - Quotation ID
   * @param {string} updatedBy - User ID who converted the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async convertQuotation(quotationId, updatedBy) {
    try {
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (quotation.status !== 'accepted') {
        throw createError.badRequest('Only accepted quotations can be converted');
      }

      quotation.status = 'converted';
      quotation.updatedBy = updatedBy;

      await quotation.save();

      return quotation;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Update inventory items based on quotation
   * @param {Array} items - Quotation items
   */
  async updateInventoryForQuotation(items) {
    try {
      console.log('Updating inventory for quotation items:', items.length);
      
      for (const item of items) {
        if (!item.vinNumbers || item.vinNumbers.length === 0) {
          // console.log('No VIN numbers for item:', item.name);
          continue;
        }

        // Find inventory item by itemId
        const inventoryItem = await Inventory.findById(item.itemId);
        if (!inventoryItem) {
          console.log('Inventory item not found for itemId:', item.itemId);
          continue;
        }

        console.log('Updating inventory for:', inventoryItem.name, 'itemId:', item.itemId);
        console.log('VIN numbers to update:', item.vinNumbers.map(vin => vin.chasisNumber));

        // Calculate new quantity and VIN numbers to update
        const vinNumbersToUpdate = item.vinNumbers.map(vin => vin.chasisNumber);
        const quantityToReduce = item.vinNumbers.length;
        const newQuantity = Math.max(0, inventoryItem.quantity - quantityToReduce);
        const inStock = newQuantity > 0;
        let status = 'active';
        if(inStock){
          status = 'active';
        }else{
          status = 'out_of_stock';
        }
        // Update both VIN status and quantity in a single operation
     const updatedInventory = await Inventory.updateOne(
          { 
            _id: item.itemId,
            'vinNumber.chasisNumber': { $in: vinNumbersToUpdate }
          },
          {
            $set: {
              'vinNumber.$[elem].status': 'hold',
              quantity: newQuantity,
              inStock: inStock,
              status: status
            }
          },
          {
            arrayFilters: [{ 'elem.chasisNumber': { $in: vinNumbersToUpdate } }]
          }
        );
        console.log('Updated inventory:', updatedInventory);
        console.log(`Updated inventory: ${inventoryItem.name} - Quantity: ${inventoryItem.quantity} → ${newQuantity}, VINs set to hold: ${quantityToReduce}`);
      }
      
      console.log('Inventory update completed successfully');
    } catch (error) {
      console.error('Error updating inventory for quotation:', error);
      throw error;
    }
  }
}

module.exports = new QuotationService();
