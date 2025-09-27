const CustomerInvoice = require('../models/customerInvoice');
const Quotation = require('../models/quotation');
const { createError } = require('../utils/apiError');

class CustomerInvoiceService {
  /**
   * Get all customer invoices with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, sort, etc.)
   * @returns {Promise<Object>} Paginated invoices
   */
  async getAllInvoices(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        search,
        status,
        customerId,
        createdBy,
        currency,
        dateFrom,
        dateTo,
        dueDateFrom,
        dueDateTo
      } = { ...filters, ...options };

      // Build query
      const query = {};

      if (status) query.status = status;
      if (customerId) query['customer.custId'] = customerId;
      if (createdBy) query.createdBy = createdBy;
      if (currency) query.currency = currency;

      // Date range filters
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      if (dueDateFrom || dueDateTo) {
        query.dueDate = {};
        if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom);
        if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo);
      }

      // Search functionality
      if (search) {
        query.$or = [
          { invoiceNumber: new RegExp(search, 'i') },
          { 'customer.name': new RegExp(search, 'i') },
          { 'customer.email': new RegExp(search, 'i') },
          { 'customer.custId': new RegExp(search, 'i') },
          { 'company.name': new RegExp(search, 'i') }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;
      const limitNum = parseInt(limit);

      // Execute query with pagination
      const invoices = await CustomerInvoice.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('quotationId', 'quotationNumber title')
        .populate('items.inventoryId', 'itemName description')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await CustomerInvoice.countDocuments(query);

      // Get summary data for dynamic filters
      const summaryData = await CustomerInvoice.aggregate([
        { $match: {} }, // Match all invoices for summary
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creatorInfo'
          }
        },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            statuses: { $addToSet: '$status' },
            currencies: { $addToSet: '$currency' },
            customers: { $addToSet: '$customer.custId' },
            creators: { 
              $addToSet: { $arrayElemAt: ['$creatorInfo.name', 0] }
            },
            // Date ranges
            minCreatedDate: { $min: '$createdAt' },
            maxCreatedDate: { $max: '$createdAt' },
            minDueDate: { $min: '$dueDate' },
            maxDueDate: { $max: '$dueDate' },
            // Financial summary
            totalAmount: { $sum: '$finalTotal' },
            averageAmount: { $avg: '$finalTotal' }
          }
        }
      ]);

      const summary = summaryData[0] || {
        totalInvoices: 0,
        statuses: [],
        currencies: [],
        customers: [],
        creators: [],
        minCreatedDate: null,
        maxCreatedDate: null,
        minDueDate: null,
        maxDueDate: null,
        totalAmount: 0,
        averageAmount: 0
      };

      const result = {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: page < Math.ceil(total / limitNum),
          hasPrev: page > 1
        },
        summary: {
          appliedFilters: {
            search: search || null,
            status: status || null,
            customerId: customerId || null,
            createdBy: createdBy || null,
            currency: currency || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            dueDateFrom: dueDateFrom || null,
            dueDateTo: dueDateTo || null
          },
          availableFilters: {
            // Basic filters
            statuses: summary.statuses ? summary.statuses.sort() : [],
            currencies: summary.currencies ? summary.currencies.sort() : [],
            customers: summary.customers ? summary.customers.sort() : [],
            creators: summary.creators ? summary.creators.sort() : [],
            
            // Date ranges for date pickers
            dateRanges: {
              created: {
                min: summary.minCreatedDate,
                max: summary.maxCreatedDate
              },
              dueDate: {
                min: summary.minDueDate,
                max: summary.maxDueDate
              }
            },
            
            // Counts for each filter option
            counts: {
              totalInvoices: summary.totalInvoices || 0,
              totalAmount: summary.totalAmount || 0,
              averageAmount: summary.averageAmount || 0
            },
            
            // Sort options
            sortOptions: [
              { value: '-createdAt', label: 'Newest First' },
              { value: 'createdAt', label: 'Oldest First' },
              { value: '-updatedAt', label: 'Recently Updated' },
              { value: 'updatedAt', label: 'Least Recently Updated' },
              { value: '-finalTotal', label: 'Highest Amount' },
              { value: 'finalTotal', label: 'Lowest Amount' },
              { value: 'invoiceNumber', label: 'Invoice Number A-Z' },
              { value: '-invoiceNumber', label: 'Invoice Number Z-A' },
              { value: 'dueDate', label: 'Due Date (Earliest)' },
              { value: '-dueDate', label: 'Due Date (Latest)' }
            ],
            
            // Pagination options
            pageSizes: [5, 10, 25, 50, 100]
          },
          sortBy: sort,
          totalResults: total,
          showingResults: `${invoices.length} of ${total} invoices`
        }
      };

      return result;
    } catch (error) {
      console.error('Error getting all invoices:', error);
      throw createError.internal('Failed to fetch invoices');
    }
  }

  /**
   * Create a new customer invoice from quotation
   * @param {Object} invoiceData - Invoice data
   * @param {string} createdBy - User ID who created the invoice
   * @returns {Promise<Object>} Created invoice
   */
  async createCustomerInvoice(invoiceData, createdBy) {
    try {
      // Validate quotation exists and is approved
      const quotation = await Quotation.findById(invoiceData.quotationId);
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (quotation.status !== 'approved') {
        throw createError.badRequest('Only approved quotations can be converted to invoices');
      }

      // Create invoice data with quotation reference
      const invoicePayload = {
        ...invoiceData,
        quotationNumber: quotation.quotationNumber,
        createdBy,
        status: 'pending'
      };

      // Create the invoice
      const invoice = new CustomerInvoice(invoicePayload);
      await invoice.save();

      // Update quotation status to confirmed
      quotation.status = 'confirmed';
      quotation.statusHistory.push({
        status: 'confirmed',
        updatedBy: createdBy,
        updatedAt: new Date(),
        notes: 'Invoice created from this quotation'
      });
      quotation.updatedBy = createdBy;
      await quotation.save();

      // Populate the created invoice
      const populatedInvoice = await CustomerInvoice.findById(invoice._id)
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('quotationId', 'quotationNumber title')
        .populate('items.inventoryId', 'itemName description')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email')
        .lean();

      return populatedInvoice;
    } catch (error) {
      console.error('Error creating customer invoice:', error);
      if (error.name === 'ValidationError') {
        throw createError.badRequest('Invalid invoice data: ' + error.message);
      }
      throw error;
    }
  }
}

module.exports = new CustomerInvoiceService();
