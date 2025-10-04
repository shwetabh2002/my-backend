const Receipt = require('../models/Receipt');
const User = require('../models/User');
const createError = require('http-errors');

class ReceiptService {
  /**
   * Create a new receipt
   * @param {Object} receiptData - Receipt data
   * @param {string} createdBy - User ID who created the receipt
   * @returns {Promise<Object>} Created receipt
   */
  async createReceipt(receiptData, createdBy) {
    try {
      // Verify customer exists and fetch customer details
      const customer = await User.findById(receiptData.customerId);
      if (!customer) {
        throw createError.badRequest('Customer not found');
      }

      // Build customer object from fetched customer data
      const customerData = {
        userId: customer._id,
        custId: customer.custId || `CUS-${customer._id.toString().slice(-6)}`,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || 'No address provided',
        countryCode: customer.countryCode || '+971',
        trn: customer.trn || null
      };

      // Create receipt with fetched customer data
      const receipt = new Receipt({
        ...receiptData,
        customer: customerData,
        createdBy
      });

      // Remove customerId from the receipt data as it's not part of the schema
      delete receipt.customerId;

      await receipt.save();
      await receipt.populate('createdBy', 'name email');
      await receipt.populate('customer.userId', 'name email trn');

      return receipt;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation error: ${errors.join(', ')}`);
      }
      if (error.code === 11000) {
        throw createError.badRequest('Receipt number already exists');
      }
      throw error;
    }
  }

  /**
   * Get receipt by ID
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Receipt
   */
  async getReceiptById(receiptId) {
    try {
      const receipt = await Receipt.findById(receiptId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email trn');

      if (!receipt) {
        throw createError.notFound('Receipt not found');
      }

      return receipt;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid receipt ID format');
      }
      throw error;
    }
  }

  /**
   * Get all receipts with filtering and pagination
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Receipts with pagination
   */
  async getAllReceipts(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        customerId,
        currency,
        paymentMethod,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build query
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { receiptNumber: { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.email': { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }


      // Customer filter
      if (customerId) {
        query['customer.userId'] = customerId;
      }

      // Currency filter
      if (currency) {
        query.currency = currency.toUpperCase();
      }

      // Payment method filter
      if (paymentMethod) {
        query.paymentMethod = { $regex: paymentMethod, $options: 'i' };
      }

      // Date range filter
      if (startDate || endDate) {
        query.receiptDate = {};
        if (startDate) {
          query.receiptDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.receiptDate.$lte = new Date(endDate);
        }
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const receipts = await Receipt.find(query)
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email trn')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await Receipt.countDocuments(query);

      // Calculate summary
      const summary = await this.getReceiptSummary(query);

      return {
        receipts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary,
        filters: {
          search,
          customerId,
          currency,
          paymentMethod,
          startDate,
          endDate,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update receipt
   * @param {string} receiptId - Receipt ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated the receipt
   * @returns {Promise<Object>} Updated receipt
   */
  async updateReceipt(receiptId, updateData, updatedBy) {
    try {
      const receipt = await Receipt.findById(receiptId);

      if (!receipt) {
        throw createError.notFound('Receipt not found');
      }

      // If customer is being updated, fetch customer details
      if (updateData.customerId) {
        const customer = await User.findById(updateData.customerId);
        if (!customer) {
          throw createError.badRequest('Customer not found');
        }

        // Build customer object from fetched customer data
        const customerData = {
          userId: customer._id,
          custId: customer.custId || `CUS-${customer._id.toString().slice(-6)}`,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address || 'No address provided',
          countryCode: customer.countryCode || '+971',
          trn: customer.trn || null
        };

        updateData.customer = customerData;
        delete updateData.customerId;
      }

      // Update receipt
      Object.assign(receipt, updateData, { updatedBy });
      await receipt.save();

      await receipt.populate('createdBy', 'name email');
      await receipt.populate('updatedBy', 'name email');
      await receipt.populate('customer.userId', 'name email trn');

      return receipt;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid receipt ID format');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation error: ${errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete receipt
   * @param {string} receiptId - Receipt ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteReceipt(receiptId) {
    try {
      const receipt = await Receipt.findById(receiptId);

      if (!receipt) {
        throw createError.notFound('Receipt not found');
      }

      // Receipts can be deleted without status restrictions

      await Receipt.findByIdAndDelete(receiptId);

      return {
        success: true,
        message: 'Receipt deleted successfully',
        receiptId: receiptId
      };
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid receipt ID format');
      }
      throw error;
    }
  }


  /**
   * Get receipt summary
   * @param {Object} query - Query filters
   * @returns {Promise<Object>} Receipt summary
   */
  async getReceiptSummary(query = {}) {
    try {
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            totalReceipts: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            averageAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' },
          }
        }
      ];

      const result = await Receipt.aggregate(pipeline);

      if (result.length === 0) {
        return {
          totalReceipts: 0,
          totalAmount: 0,
          averageAmount: 0,
          minAmount: 0,
          maxAmount: 0
        };
      }

      const summary = result[0];

      return {
        totalReceipts: summary.totalReceipts,
        totalAmount: summary.totalAmount,
        averageAmount: Math.round(summary.averageAmount * 100) / 100,
        minAmount: summary.minAmount,
        maxAmount: summary.maxAmount
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get receipts by customer
   * @param {string} customerId - Customer ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Customer receipts
   */
  async getReceiptsByCustomer(customerId, filters = {}) {
    try {
      const query = { 'customer.userId': customerId, ...filters };
      return await this.getAllReceipts({ ...filters, customerId });
    } catch (error) {
      throw error;
    }
  }

}

module.exports = new ReceiptService();
