const CustomerInvoice = require('../models/customerInvoice');
const Quotation = require('../models/quotation');
const { createError } = require('../utils/apiError');
const Company = require('../models/Company');


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
        .populate('items.itemId', 'itemName description')
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
   * @param {Object} invoiceData - Invoice data (only fields not in quotation)
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

      // Build invoice payload from quotation data
      const invoicePayload = {
        // From quotation
        quotationId: quotation._id,
        quotationNumber: quotation.quotationNumber,
        customer: quotation.customer,
        items: quotation.items,
        subtotal: quotation.subtotal,
        discount: quotation.totalDiscount,
        discountType: quotation.discountType,
        additionalExpenses: quotation.additionalExpenses,
        VAT: quotation.VAT,
        vatAmount: quotation.vatAmount,
        totalAmount: quotation.totalAmount,
        currency: quotation.currency,
        notes: quotation.notes,
        
        // From payload (fields not in quotation)
        moreExpense: invoiceData.moreExpense || { description: '', amount: 0 },
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
        notes: invoiceData.notes || quotation.notes,
        customerPayment: invoiceData.customerPayment || {
          paymentStatus: 'due',
          paymentAmount: 0,
          paymentMethod: 'cash',
          paymentNotes: ''
        },
        
        // System fields
        createdBy,
        status: 'draft'
      };

      // Process more expenses - ensure proper structure
      if (invoicePayload.moreExpense) {
        invoicePayload.moreExpense = {
          description: invoicePayload.moreExpense.description || '',
          amount: invoicePayload.moreExpense.amount || 0
        };
      } else {
        invoicePayload.moreExpense = {
          description: '',
          amount: 0
        };
      }

      // Add moreExpense to the total (additionalExpenses already calculated in quotation)
      const moreExpenseAmount = invoicePayload.moreExpense.amount || 0;
      const finalTotal = quotation.totalAmount + moreExpenseAmount;

      // Update final total with moreExpense
      invoicePayload.finalTotal = finalTotal;

      // Set payment status and root status based on payment amount
      const paymentAmount = invoicePayload.customerPayment.paymentAmount || 0;
      const totalAmount = invoicePayload.finalTotal;

      if (paymentAmount >= totalAmount) {
        // Fully paid
        invoicePayload.customerPayment.paymentStatus = 'fully_paid';
        invoicePayload.status = 'paid';
      } else if (paymentAmount > 0) {
        // Partially paid
        invoicePayload.customerPayment.paymentStatus = 'partially_paid';
        invoicePayload.status = 'sent';
      } else {
        // Not paid
        invoicePayload.customerPayment.paymentStatus = 'due';
        invoicePayload.status = 'draft';
      }

      // Debug: Log the payload before creating invoice
      console.log('Invoice payload:', JSON.stringify(invoicePayload, null, 2));

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
        .populate('items.itemId', 'itemName description')
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

  /**
   * Get invoice by ID with company details
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice details with company information
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await CustomerInvoice.findById(invoiceId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.supplierId', 'name email custId')
        .populate('quotationId', 'quotationNumber status');

      if (!invoice) {
        throw createError.notFound('Invoice not found');
      }

      // Fetch company data and add to response
      const company = await Company.findOne();
      
      // Convert invoice to plain object and add company
      const invoiceObj = invoice.toObject();
      if (company) {
        // Create company object with bank details based on invoice currency
        const companyObj = company.toObject();
        
        // Add bank details for the specific currency, default to AED
        if (invoiceObj.currency && companyObj.bankDetails && companyObj.bankDetails.get) {
          const currencyBankDetails = companyObj.bankDetails.get(invoiceObj.currency);
          if (currencyBankDetails) {
            // Use the invoice's currency bank details directly
            companyObj.bankDetails = currencyBankDetails;
          } else {
            // If no bank details for this currency, use AED as default
            const aedBankDetails = companyObj.bankDetails.get('AED');
            if (aedBankDetails) {
              companyObj.bankDetails = aedBankDetails;
            } else {
              // If no AED bank details available, remove bankDetails
              delete companyObj.bankDetails;
            }
          }
        } else {
          // If no currency or bankDetails, try to use AED as default
          if (companyObj.bankDetails && companyObj.bankDetails.get) {
            const aedBankDetails = companyObj.bankDetails.get('AED');
            if (aedBankDetails) {
              companyObj.bankDetails = aedBankDetails;
            } else {
              delete companyObj.bankDetails;
            }
          } else {
            delete companyObj.bankDetails;
          }
        }
        
        invoiceObj.company = companyObj;
      }

      return invoiceObj;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid invoice ID format');
      }
      throw error;
    }
  }
}

module.exports = new CustomerInvoiceService();
