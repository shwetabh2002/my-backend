const CustomerInvoice = require('../models/customerInvoice');
const Quotation = require('../models/quotation');
const Inventory = require('../models/Inventory');
const { createError } = require('../utils/apiError');
const Company = require('../models/Company');
const Expense = require('../models/Expense');
const quotationService = require('./quotationService');
const receiptService = require('./receiptService');


class CustomerInvoiceService {
  /**
   * Get all customer invoices with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, sort, etc.)
   * @returns {Promise<Object>} Paginated invoices
   */
  async getAllInvoices(filters = {}, options = {}, currentUser, isAdmin, companyId = null) {
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

      // Filter by companyId if provided
      if (companyId) {
        query.companyId = companyId;
      }

      // If user is not admin, filter by quotation's createdBy (stored in quotationCreatedBy field)
      if (!isAdmin && currentUser && currentUser._id) {
        query.quotationCreatedBy = currentUser._id;
      } else if (createdBy) {
        // Admin can filter by specific createdBy if provided
        query.createdBy = createdBy;
      }

      if (status) query.status = status;
      if (customerId) query['customer.custId'] = customerId;
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
        .populate('customer.userId', 'name email trn ')
        .populate('quotationId', 'quotationNumber title bookingAmount createdAt createdBy')
        .populate('items.itemId', 'itemName description')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await CustomerInvoice.countDocuments(query);

      // Get summary data for dynamic filters - calculate in JavaScript instead of aggregation
      const allInvoices = await CustomerInvoice.find({})
        .select('status currency customer.custId createdBy createdAt dueDate finalTotal')
        .populate('createdBy', 'name')
        .lean();

      // Calculate summary in JavaScript - much faster
      const statuses = [...new Set(allInvoices.map(inv => inv.status).filter(Boolean))];
      const currencies = [...new Set(allInvoices.map(inv => inv.currency).filter(Boolean))];
      const customers = [...new Set(allInvoices.map(inv => inv.customer?.custId).filter(Boolean))];
      const creators = [...new Set(allInvoices.map(inv => inv.createdBy?.name).filter(Boolean))];
      
      const dates = allInvoices.map(inv => inv.createdAt).filter(Boolean);
      const dueDates = allInvoices.map(inv => inv.dueDate).filter(Boolean);
      const amounts = allInvoices.map(inv => inv.finalTotal).filter(amount => amount > 0);
      
      const summary = {
        totalInvoices: allInvoices.length,
        statuses,
        currencies,
        customers,
        creators,
        minCreatedDate: dates.length > 0 ? new Date(Math.min(...dates)) : null,
        maxCreatedDate: dates.length > 0 ? new Date(Math.max(...dates)) : null,
        minDueDate: dueDates.length > 0 ? new Date(Math.min(...dueDates)) : null,
        maxDueDate: dueDates.length > 0 ? new Date(Math.max(...dueDates)) : null,
        totalAmount: amounts.reduce((sum, amount) => sum + amount, 0),
        averageAmount: amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0
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
  async createCustomerInvoice(invoiceData, createdBy, companyId = null) {
    try {
      // Validate quotation exists and is approved
      const quotation = await Quotation.findById(invoiceData.quotationId);
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      if (quotation.status !== 'approved') {
        throw createError.badRequest('Only approved quotations can be converted to invoices');
      }

      // Process additionalExpenses - ensure it's an array
      let additionalExpenses = [];
      if (quotation.additionalExpenses) {
        if (Array.isArray(quotation.additionalExpenses)) {
          additionalExpenses = quotation.additionalExpenses;
        } else {
          // Handle legacy object format - convert to array
          additionalExpenses = [{
            expenceType: quotation.additionalExpenses.expenceType || 'Other',
            description: quotation.additionalExpenses.description || '',
            amount: quotation.additionalExpenses.amount || 0,
            currency: quotation.additionalExpenses.currency || quotation.currency || 'AED'
          }];
        }
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
        additionalExpenses: additionalExpenses,
        VAT: quotation.VAT,
        vatAmount: quotation.vatAmount,
        totalAmount: quotation.totalAmount,
        currency: quotation.currency,
        notes: quotation.notes,
        exportTo: quotation.exportTo,
        
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
        quotationCreatedBy: quotation.createdBy, // Store quotation's createdBy for efficient filtering
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

      // Add companyId if provided
      if (companyId) {
        invoicePayload.companyId = companyId;
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


      const receiptData = {
        customerId: quotation.customer.userId,
        quotationId: invoiceData.quotationId,
        paymentMethod: invoiceData.customerPayment.paymentMethod || 'cash', // Use provided paymentMethod or default
        receiptDate: new Date(),
        amount: paymentAmount,
        currency: quotation.currency,
        description: invoiceData.notes || `Booking payment for quotation ${quotation.quotationNumber}`, // Use provided description or default
      };

      // const receipt = await receiptService.createReceipt(receiptData, createdBy);

      
      // Populate the created invoice
      const populatedInvoice = await CustomerInvoice.findById(invoice._id)
        .populate('createdBy', 'name email')
        .populate('customer.userId', 'name email trn')
        .populate('quotationId', 'quotationNumber title bookingAmount')
        .populate('items.itemId', 'itemName description')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email')
        .lean();

        await quotationService.updateInventoryStatusForQuotation(populatedInvoice.items,'sold');

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
  async getInvoiceById(invoiceId, companyId = null) {
    try {
      const query = { _id: invoiceId };
      if (companyId) {
        query.companyId = companyId;
      }
      
      const invoice = await CustomerInvoice.findOne(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email trn')
        .populate('items.supplierId', 'name email custId')
        .populate('quotationId', 'quotationNumber status bookingAmount');

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

  /**
   * Calculate sales analytics at code level for better performance
   * @param {Array} invoices - Array of invoice documents
   * @param {String} groupBy - Grouping type (day, week, month, year)
   * @param {Number} limit - Limit for time series data
   * @param {Object} expenseAnalytics - Expense analytics data
   * @returns {Object} Calculated analytics
   */
  async calculateSalesAnalytics(invoices, groupBy = 'day', limit = 30, expenseAnalytics = null) {
    // Initialize currency-specific summary counters
    const currencySummaries = new Map();
    const allCurrencies = [...new Set(invoices.map(invoice => invoice.currency || 'AED'))];
    
    // Initialize summary for each currency
    allCurrencies.forEach(currency => {
      currencySummaries.set(currency, {
        currency,
        totalInvoices: 0,
        totalAmount: 0,
        totalVatAmount: 0,
        totalSubtotal: 0,
        totalDiscount: 0,
        totalMoreExpense: 0,
        totalAdditionalExpense: 0,
        totalCostAmount: 0,
        totalSellingAmount: 0,
        totalNetRevenue: 0,
        totalProfitAmount: 0,
        totalProfitWithoutVAT: 0,
        totalProfitWithVAT: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paidProfitAmount: 0,
        paidProfitWithoutVAT: 0,
        paidProfitWithVAT: 0,
        pendingProfitAmount: 0,
        pendingProfitWithoutVAT: 0,
        pendingProfitWithVAT: 0,
        averageInvoiceValue: 0,
        averageProfitPerInvoice: 0,
        averageProfitPerInvoiceWithoutVAT: 0,
        averageProfitPerInvoiceWithVAT: 0,
        minInvoiceValue: 0,
        maxInvoiceValue: 0,
        minProfitPerInvoice: 0,
        minProfitPerInvoiceWithoutVAT: 0,
        minProfitPerInvoiceWithVAT: 0,
        maxProfitPerInvoice: 0,
        maxProfitPerInvoiceWithoutVAT: 0,
        maxProfitPerInvoiceWithVAT: 0
      });
    });

    // Overall summary (aggregated across all currencies)
    let overallSummary = {
      totalInvoices: 0,
      totalAmount: 0,
      totalVatAmount: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      totalMoreExpense: 0,
      totalAdditionalExpense: 0,
      totalCostAmount: 0,
      totalSellingAmount: 0,
      totalNetRevenue: 0,
      totalProfitAmount: 0,
      totalProfitWithoutVAT: 0,
      totalProfitWithVAT: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      paidAmount: 0,
      pendingAmount: 0,
      paidProfitAmount: 0,
      paidProfitWithoutVAT: 0,
      paidProfitWithVAT: 0,
      pendingProfitAmount: 0,
      pendingProfitWithoutVAT: 0,
      pendingProfitWithVAT: 0,
      averageInvoiceValue: 0,
      averageProfitPerInvoice: 0,
      averageProfitPerInvoiceWithoutVAT: 0,
      averageProfitPerInvoiceWithVAT: 0,
      minInvoiceValue: 0,
      maxInvoiceValue: 0,
      minProfitPerInvoice: 0,
      minProfitPerInvoiceWithoutVAT: 0,
      minProfitPerInvoiceWithVAT: 0,
      maxProfitPerInvoice: 0,
      maxProfitPerInvoiceWithoutVAT: 0,
      maxProfitPerInvoiceWithVAT: 0
    };

    // Time series data - currency-specific
    const timeSeriesMap = new Map();
    const profitValues = [];
    const profitValuesWithoutVAT = [];
    const profitValuesWithVAT = [];
    
    // Currency-specific time series
    const currencyTimeSeriesMap = new Map();

    // Fetch current cost prices from inventory for all unique itemIds
    const itemIds = [...new Set(invoices.flatMap(invoice => 
      invoice.items.map(item => item.itemId).filter(id => id)
    ))];
    
    const inventoryItems = await Inventory.find({ 
      _id: { $in: itemIds } 
    }).select('_id costPrice').lean();
    
    // Create a map for quick cost price lookup
    const costPriceMap = new Map();
    inventoryItems.forEach(item => {
      costPriceMap.set(item._id.toString(), item.costPrice || 0);
    });

    // Process each invoice
    invoices.forEach(invoice => {
      const currency = invoice.currency || 'AED';
      const currencySummary = currencySummaries.get(currency);
      
      // Calculate item costs using current inventory cost prices
      const itemCosts = invoice.items.reduce((sum, item) => {
        const currentCostPrice = item.itemId ? 
          (costPriceMap.get(item.itemId.toString()) || 0) : 
          (item.costPrice || 0);
        return sum + (currentCostPrice * (item.quantity || 0));
      }, 0);
      const itemSellingAmount = invoice.items.reduce((sum, item) => 
        sum + (item.totalPrice || 0), 0);

      // Calculate additional expenses (sum of all expenses in array)
      const additionalExpenseAmount = invoice.additionalExpenses && Array.isArray(invoice.additionalExpenses)
        ? invoice.additionalExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
        : (invoice.additionalExpenses?.amount || 0); // Fallback for legacy object format
      const moreExpenseAmount = invoice.moreExpense?.amount || 0;
      const totalDiscount = invoice.totalDiscount || 0;
      const vatAmount = invoice.vatAmount || 0;

      // Calculate net revenue and costs
      const netRevenue = itemSellingAmount - totalDiscount;
      const totalCosts = itemCosts + additionalExpenseAmount + moreExpenseAmount;
      
      // Calculate profits
      const profitWithoutVAT = netRevenue - totalCosts;
      const profitWithVAT = profitWithoutVAT - vatAmount;

      // Update currency-specific summary
      currencySummary.totalInvoices++;
      currencySummary.totalAmount += invoice.totalAmount || 0;
      currencySummary.totalVatAmount += vatAmount;
      currencySummary.totalSubtotal += invoice.subtotal || 0;
      currencySummary.totalDiscount += totalDiscount;
      currencySummary.totalMoreExpense += moreExpenseAmount;
      currencySummary.totalAdditionalExpense += additionalExpenseAmount;
      currencySummary.totalCostAmount += totalCosts;
      currencySummary.totalSellingAmount += itemSellingAmount;
      currencySummary.totalNetRevenue += netRevenue;
      currencySummary.totalProfitAmount += profitWithoutVAT;
      currencySummary.totalProfitWithoutVAT += profitWithoutVAT;
      currencySummary.totalProfitWithVAT += profitWithVAT;

      // Status-based calculations for currency
      if (invoice.status === 'paid') {
        currencySummary.paidInvoices++;
        currencySummary.paidAmount += invoice.totalAmount || 0;
        currencySummary.paidProfitAmount += profitWithoutVAT;
        currencySummary.paidProfitWithoutVAT += profitWithoutVAT;
        currencySummary.paidProfitWithVAT += profitWithVAT;
      } else if (['sent', 'draft'].includes(invoice.status)) {
        currencySummary.pendingInvoices++;
        currencySummary.pendingAmount += invoice.totalAmount || 0;
        currencySummary.pendingProfitAmount += profitWithoutVAT;
        currencySummary.pendingProfitWithoutVAT += profitWithoutVAT;
        currencySummary.pendingProfitWithVAT += profitWithVAT;
      }

      // Update overall summary (aggregated across all currencies)
      overallSummary.totalInvoices++;
      overallSummary.totalAmount += invoice.totalAmount || 0;
      overallSummary.totalVatAmount += vatAmount;
      overallSummary.totalSubtotal += invoice.subtotal || 0;
      overallSummary.totalDiscount += totalDiscount;
      overallSummary.totalMoreExpense += moreExpenseAmount;
      overallSummary.totalAdditionalExpense += additionalExpenseAmount;
      overallSummary.totalCostAmount += totalCosts;
      overallSummary.totalSellingAmount += itemSellingAmount;
      overallSummary.totalNetRevenue += netRevenue;
      overallSummary.totalProfitAmount += profitWithoutVAT;
      overallSummary.totalProfitWithoutVAT += profitWithoutVAT;
      overallSummary.totalProfitWithVAT += profitWithVAT;

      // Status-based calculations for overall
      if (invoice.status === 'paid') {
        overallSummary.paidInvoices++;
        overallSummary.paidAmount += invoice.totalAmount || 0;
        overallSummary.paidProfitAmount += profitWithoutVAT;
        overallSummary.paidProfitWithoutVAT += profitWithoutVAT;
        overallSummary.paidProfitWithVAT += profitWithVAT;
      } else if (['sent', 'draft'].includes(invoice.status)) {
        overallSummary.pendingInvoices++;
        overallSummary.pendingAmount += invoice.totalAmount || 0;
        overallSummary.pendingProfitAmount += profitWithoutVAT;
        overallSummary.pendingProfitWithoutVAT += profitWithoutVAT;
        overallSummary.pendingProfitWithVAT += profitWithVAT;
      }

      // Store profit values for min/max calculations
      profitValues.push(profitWithoutVAT);
      profitValuesWithoutVAT.push(profitWithoutVAT);
      profitValuesWithVAT.push(profitWithVAT);

      // Time series grouping - overall and currency-specific
      if (groupBy !== 'none') {
        const date = new Date(invoice.createdAt);
        const timeKey = this.getTimeKey(date, groupBy);
        const currencyTimeKey = `${timeKey}_${currency}`;
        
        // Overall time series
        if (!timeSeriesMap.has(timeKey)) {
          timeSeriesMap.set(timeKey, {
            _id: this.getTimeGroupingId(date, groupBy),
            date: this.getDateField(date, groupBy),
            totalInvoices: 0,
            totalAmount: 0,
            totalVatAmount: 0,
            totalSubtotal: 0,
            totalDiscount: 0,
            totalMoreExpense: 0,
            totalAdditionalExpense: 0,
            totalCostAmount: 0,
            totalSellingAmount: 0,
            totalNetRevenue: 0,
            totalProfitAmount: 0,
            totalProfitWithoutVAT: 0,
            totalProfitWithVAT: 0,
            paidInvoices: 0,
            pendingInvoices: 0,
            paidAmount: 0,
            pendingAmount: 0,
            paidProfitAmount: 0,
            paidProfitWithoutVAT: 0,
            paidProfitWithVAT: 0,
            pendingProfitAmount: 0,
            pendingProfitWithoutVAT: 0,
            pendingProfitWithVAT: 0,
            averageInvoiceValue: 0,
            averageProfitPerInvoice: 0,
            averageProfitPerInvoiceWithoutVAT: 0,
            averageProfitPerInvoiceWithVAT: 0
          });
        }

        // Currency-specific time series
        if (!currencyTimeSeriesMap.has(currencyTimeKey)) {
          currencyTimeSeriesMap.set(currencyTimeKey, {
            _id: this.getTimeGroupingId(date, groupBy),
            date: this.getDateField(date, groupBy),
            currency: currency,
            totalInvoices: 0,
            totalAmount: 0,
            totalVatAmount: 0,
            totalSubtotal: 0,
            totalDiscount: 0,
            totalMoreExpense: 0,
            totalAdditionalExpense: 0,
            totalCostAmount: 0,
            totalSellingAmount: 0,
            totalNetRevenue: 0,
            totalProfitAmount: 0,
            totalProfitWithoutVAT: 0,
            totalProfitWithVAT: 0,
            paidInvoices: 0,
            pendingInvoices: 0,
            paidAmount: 0,
            pendingAmount: 0,
            paidProfitAmount: 0,
            paidProfitWithoutVAT: 0,
            paidProfitWithVAT: 0,
            pendingProfitAmount: 0,
            pendingProfitWithoutVAT: 0,
            pendingProfitWithVAT: 0,
            averageInvoiceValue: 0,
            averageProfitPerInvoice: 0,
            averageProfitPerInvoiceWithoutVAT: 0,
            averageProfitPerInvoiceWithVAT: 0
          });
        }

        // Update overall time series
        const timeData = timeSeriesMap.get(timeKey);
        timeData.totalInvoices++;
        timeData.totalAmount += invoice.totalAmount || 0;
        timeData.totalVatAmount += vatAmount;
        timeData.totalSubtotal += invoice.subtotal || 0;
        timeData.totalDiscount += totalDiscount;
        timeData.totalMoreExpense += moreExpenseAmount;
        timeData.totalAdditionalExpense += additionalExpenseAmount;
        timeData.totalCostAmount += totalCosts;
        timeData.totalSellingAmount += itemSellingAmount;
        timeData.totalNetRevenue += netRevenue;
        timeData.totalProfitAmount += profitWithoutVAT;
        timeData.totalProfitWithoutVAT += profitWithoutVAT;
        timeData.totalProfitWithVAT += profitWithVAT;

        if (invoice.status === 'paid') {
          timeData.paidInvoices++;
          timeData.paidAmount += invoice.totalAmount || 0;
          timeData.paidProfitAmount += profitWithoutVAT;
          timeData.paidProfitWithoutVAT += profitWithoutVAT;
          timeData.paidProfitWithVAT += profitWithVAT;
        } else if (['sent', 'draft'].includes(invoice.status)) {
          timeData.pendingInvoices++;
          timeData.pendingAmount += invoice.totalAmount || 0;
          timeData.pendingProfitAmount += profitWithoutVAT;
          timeData.pendingProfitWithoutVAT += profitWithoutVAT;
          timeData.pendingProfitWithVAT += profitWithVAT;
        }

        // Update currency-specific time series
        const currencyTimeData = currencyTimeSeriesMap.get(currencyTimeKey);
        currencyTimeData.totalInvoices++;
        currencyTimeData.totalAmount += invoice.totalAmount || 0;
        currencyTimeData.totalVatAmount += vatAmount;
        currencyTimeData.totalSubtotal += invoice.subtotal || 0;
        currencyTimeData.totalDiscount += totalDiscount;
        currencyTimeData.totalMoreExpense += moreExpenseAmount;
        currencyTimeData.totalAdditionalExpense += additionalExpenseAmount;
        currencyTimeData.totalCostAmount += totalCosts;
        currencyTimeData.totalSellingAmount += itemSellingAmount;
        currencyTimeData.totalNetRevenue += netRevenue;
        currencyTimeData.totalProfitAmount += profitWithoutVAT;
        currencyTimeData.totalProfitWithoutVAT += profitWithoutVAT;
        currencyTimeData.totalProfitWithVAT += profitWithVAT;

        if (invoice.status === 'paid') {
          currencyTimeData.paidInvoices++;
          currencyTimeData.paidAmount += invoice.totalAmount || 0;
          currencyTimeData.paidProfitAmount += profitWithoutVAT;
          currencyTimeData.paidProfitWithoutVAT += profitWithoutVAT;
          currencyTimeData.paidProfitWithVAT += profitWithVAT;
        } else if (['sent', 'draft'].includes(invoice.status)) {
          currencyTimeData.pendingInvoices++;
          currencyTimeData.pendingAmount += invoice.totalAmount || 0;
          currencyTimeData.pendingProfitAmount += profitWithoutVAT;
          currencyTimeData.pendingProfitWithoutVAT += profitWithoutVAT;
          currencyTimeData.pendingProfitWithVAT += profitWithVAT;
        }
      }
    });

    // Calculate averages and min/max for overall summary
    if (overallSummary.totalInvoices > 0) {
      overallSummary.averageInvoiceValue = overallSummary.totalAmount / overallSummary.totalInvoices;
      overallSummary.averageProfitPerInvoice = overallSummary.totalProfitAmount / overallSummary.totalInvoices;
      overallSummary.averageProfitPerInvoiceWithoutVAT = overallSummary.totalProfitWithoutVAT / overallSummary.totalInvoices;
      overallSummary.averageProfitPerInvoiceWithVAT = overallSummary.totalProfitWithVAT / overallSummary.totalInvoices;
    }

    if (profitValues.length > 0) {
      overallSummary.minInvoiceValue = Math.min(...invoices.map(i => i.totalAmount || 0));
      overallSummary.maxInvoiceValue = Math.max(...invoices.map(i => i.totalAmount || 0));
      overallSummary.minProfitPerInvoice = Math.min(...profitValues);
      overallSummary.minProfitPerInvoiceWithoutVAT = Math.min(...profitValuesWithoutVAT);
      overallSummary.minProfitPerInvoiceWithVAT = Math.min(...profitValuesWithVAT);
      overallSummary.maxProfitPerInvoice = Math.max(...profitValues);
      overallSummary.maxProfitPerInvoiceWithoutVAT = Math.max(...profitValuesWithoutVAT);
      overallSummary.maxProfitPerInvoiceWithVAT = Math.max(...profitValuesWithVAT);
    }

    // Calculate averages and min/max for each currency
    currencySummaries.forEach(currencySummary => {
      if (currencySummary.totalInvoices > 0) {
        currencySummary.averageInvoiceValue = currencySummary.totalAmount / currencySummary.totalInvoices;
        currencySummary.averageProfitPerInvoice = currencySummary.totalProfitAmount / currencySummary.totalInvoices;
        currencySummary.averageProfitPerInvoiceWithoutVAT = currencySummary.totalProfitWithoutVAT / currencySummary.totalInvoices;
        currencySummary.averageProfitPerInvoiceWithVAT = currencySummary.totalProfitWithVAT / currencySummary.totalInvoices;
      }
    });

    // Process time series data - overall
    const timeSeries = Array.from(timeSeriesMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-limit);

    // Process currency-specific time series data
    const currencyTimeSeries = Array.from(currencyTimeSeriesMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-limit);

    // Calculate averages for overall time series
    timeSeries.forEach(timeData => {
      if (timeData.totalInvoices > 0) {
        timeData.averageInvoiceValue = timeData.totalAmount / timeData.totalInvoices;
        timeData.averageProfitPerInvoice = timeData.totalProfitAmount / timeData.totalInvoices;
        timeData.averageProfitPerInvoiceWithoutVAT = timeData.totalProfitWithoutVAT / timeData.totalInvoices;
        timeData.averageProfitPerInvoiceWithVAT = timeData.totalProfitWithVAT / timeData.totalInvoices;
      }
    });

    // Calculate averages for currency-specific time series
    currencyTimeSeries.forEach(timeData => {
      if (timeData.totalInvoices > 0) {
        timeData.averageInvoiceValue = timeData.totalAmount / timeData.totalInvoices;
        timeData.averageProfitPerInvoice = timeData.totalProfitAmount / timeData.totalInvoices;
        timeData.averageProfitPerInvoiceWithoutVAT = timeData.totalProfitWithoutVAT / timeData.totalInvoices;
        timeData.averageProfitPerInvoiceWithVAT = timeData.totalProfitWithVAT / timeData.totalInvoices;
      }
    });

    // Calculate net profit after expenses
    const totalExpenses = expenseAnalytics ? expenseAnalytics.totalExpenses : 0;
    const netProfitAfterExpense = overallSummary.totalProfitWithoutVAT - totalExpenses;
    
    // Add expense data to summary
    const enhancedSummary = {
      ...overallSummary,
      totalExpenses,
      netProfitAfterExpense,
      expenseRatio: overallSummary.totalProfitWithoutVAT > 0 ? (totalExpenses / overallSummary.totalProfitWithoutVAT) * 100 : 0
    };

    // Add expense data to currency summaries
    const enhancedCurrencySummaries = Array.from(currencySummaries.values()).map(currencySummary => {
      const currencyExpenses = expenseAnalytics ? 
        expenseAnalytics.expensesByCurrency.find(e => e._id === currencySummary.currency) : null;
      const currencyTotalExpenses = currencyExpenses ? currencyExpenses.totalAmount : 0;
      const currencyNetProfitAfterExpense = currencySummary.totalProfitWithoutVAT - currencyTotalExpenses;
      
      return {
        ...currencySummary,
        totalExpenses: currencyTotalExpenses,
        netProfitAfterExpense: currencyNetProfitAfterExpense,
        expenseRatio: currencySummary.totalProfitWithoutVAT > 0 ? (currencyTotalExpenses / currencySummary.totalProfitWithoutVAT) * 100 : 0
      };
    });

    return {
      summary: enhancedSummary,
      currencySummaries: enhancedCurrencySummaries,
      timeSeries: groupBy !== 'none' ? timeSeries : [],
      currencyTimeSeries: groupBy !== 'none' ? currencyTimeSeries : []
    };
  }

  /**
   * Get time key for grouping
   * @param {Date} date - Date to process
   * @param {String} groupBy - Grouping type
   * @returns {String} Time key
   */
  getTimeKey(date, groupBy) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = Math.ceil(day / 7);

    switch (groupBy) {
      case 'year': return `${year}`;
      case 'month': return `${year}-${month.toString().padStart(2, '0')}`;
      case 'week': return `${year}-W${week.toString().padStart(2, '0')}`;
      case 'day': 
      default: return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get time grouping ID object
   * @param {Date} date - Date to process
   * @param {String} groupBy - Grouping type
   * @returns {Object} Time grouping ID
   */
  getTimeGroupingId(date, groupBy) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = Math.ceil(day / 7);

    switch (groupBy) {
      case 'year': return { year };
      case 'month': return { year, month };
      case 'week': return { year, week };
      case 'day': 
      default: return { year, month, day };
    }
  }

  /**
   * Get date field for time series
   * @param {Date} date - Date to process
   * @param {String} groupBy - Grouping type
   * @returns {Date} Formatted date
   */
  getDateField(date, groupBy) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (groupBy) {
      case 'year': return new Date(year, 0, 1);
      case 'month': return new Date(year, month - 1, 1);
      case 'week': return new Date(year, month - 1, Math.ceil(day / 7) * 7 - 6);
      case 'day': 
      default: return new Date(year, month - 1, day);
    }
  }

  /**
   * Get total sales analytics for dashboard
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (dateFrom, dateTo, groupBy, etc.)
   * @returns {Promise<Object>} Sales analytics data
   */
  async getTotalSales(filters = {}, options = {}, companyId = null) {
    try {
      const {
        dateFrom,
        dateTo,
        status,
        customerId,
        createdBy,
        currency,
        groupBy = 'day', // day, week, month, year
        limit = 30,
        // Expense filters
        expenseStatus,
        expenseCategory,
        expenseCurrency
      } = { ...filters, ...options };

      // Build base query
      const baseQuery = {};
      
      // Filter by companyId if provided
      if (companyId) {
        baseQuery.companyId = companyId;
      }
      
      if (status) baseQuery.status = status;
      if (customerId) baseQuery['customer.custId'] = customerId;
      if (createdBy) baseQuery.createdBy = createdBy;
      if (currency) baseQuery.currency = currency;

      // Date range filters
      if (dateFrom || dateTo) {
        baseQuery.createdAt = {};
        if (dateFrom) baseQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) baseQuery.createdAt.$lte = new Date(dateTo);
      }

      // Set default date range if not provided (last 30 days)
      if (!dateFrom && !dateTo) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        baseQuery.createdAt = { $gte: thirtyDaysAgo };
      }

      // Fetch invoices with minimal data - much more efficient!
      const invoices = await CustomerInvoice.find(baseQuery)
        .select('totalAmount vatAmount subtotal totalDiscount moreExpense additionalExpenses items status createdAt currency customer createdBy exportTo')
        .lean();

      // Get expense analytics with filters
      const expenseAnalytics = await this.getExpenseAnalytics(baseQuery, {
        expenseStatus,
        expenseCategory,
        expenseCurrency
      });

      // Calculate analytics at code level - much faster and more maintainable
      const analytics = await this.calculateSalesAnalytics(invoices, groupBy, limit, expenseAnalytics);

      // Get additional analytics
      const additionalAnalytics = await this.getAdditionalSalesAnalytics(baseQuery);

      return {
        ...analytics,
        additionalAnalytics,
        expenseAnalytics,
        filters: {
          // Date filters
          dateFrom: dateFrom ? new Date(dateFrom) : null,
          dateTo: dateTo ? new Date(dateTo) : null,
          dateRange: {
            from: dateFrom ? new Date(dateFrom) : null,
            to: dateTo ? new Date(dateTo) : null,
            applied: !!(dateFrom || dateTo)
          },
          
          // Status filters
          status: {
            value: status || null,
            applied: !!status,
            options: ['draft', 'sent', 'paid']
          },
          
          // Customer filters
          customerId: {
            value: customerId || null,
            applied: !!customerId,
            options: additionalAnalytics.topCustomers ? additionalAnalytics.topCustomers.map(c => c._id) : [],
            availableCustomers: additionalAnalytics.topCustomers ? additionalAnalytics.topCustomers.map(c => ({
              customerId: c._id,
              customerName: c.customerName,
              totalAmount: c.totalAmount,
              invoiceCount: c.invoiceCount
            })) : []
          },
          
          // User filters
          createdBy: {
            value: createdBy || null,
            applied: !!createdBy,
            options: [], // Will be populated from additional analytics if needed
            availableEmployees: [] // Will be populated from additional analytics if needed
          },
          
          // Currency filters
          currency: {
            value: currency || null,
            applied: !!currency,
            options: analytics.currencySummaries ? analytics.currencySummaries.map(c => c.currency) : [],
            availableCurrencies: analytics.currencySummaries ? analytics.currencySummaries.map(c => ({
              currency: c.currency,
              totalInvoices: c.totalInvoices,
              totalAmount: c.totalAmount,
              totalProfit: c.totalProfitWithoutVAT
            })) : []
          },
          
          // Expense filters
          expenseStatus: {
            value: expenseStatus || null,
            applied: !!expenseStatus,
            options: ['pending', 'approved', 'rejected', 'paid'],
            availableStatuses: expenseAnalytics.expensesByStatus ? expenseAnalytics.expensesByStatus.map(s => ({
              status: s._id,
              totalAmount: s.totalAmount,
              count: s.count
            })) : []
          },
          
          expenseCategory: {
            value: expenseCategory || null,
            applied: !!expenseCategory,
            options: expenseAnalytics.expensesByCategory ? expenseAnalytics.expensesByCategory.map(c => c._id) : [],
            availableCategories: expenseAnalytics.expensesByCategory ? expenseAnalytics.expensesByCategory.map(c => ({
              category: c._id,
              totalAmount: c.totalAmount,
              count: c.count
            })) : []
          },
          
          expenseCurrency: {
            value: expenseCurrency || null,
            applied: !!expenseCurrency,
            options: expenseAnalytics.expensesByCurrency ? expenseAnalytics.expensesByCurrency.map(c => c._id) : [],
            availableCurrencies: expenseAnalytics.expensesByCurrency ? expenseAnalytics.expensesByCurrency.map(c => ({
              currency: c._id,
              totalAmount: c.totalAmount,
              count: c.count
            })) : []
          },
          
          // ExportTo filters
          exportTo: {
            value: null, // This would need to be added as a parameter if filtering by exportTo is needed
            applied: false,
            options: additionalAnalytics.salesByExportTo ? additionalAnalytics.salesByExportTo.map(e => e._id).filter(Boolean) : [],
            availableExportTo: additionalAnalytics.salesByExportTo ? additionalAnalytics.salesByExportTo.map(e => ({
              exportTo: e._id,
              totalInvoices: e.count,
              totalAmount: e.totalAmount
            })) : []
          },
          
          // Grouping options
          groupBy: {
            value: groupBy || 'day',
            applied: true,
            options: ['day', 'week', 'month', 'year', 'none']
          },
          
          // Limit options
          limit: {
            value: limit || 30,
            applied: true,
            type: 'number'
          },
          
          // Applied filters summary
          appliedFilters: {
            count: [dateFrom, dateTo, status, customerId, createdBy, currency, expenseStatus, expenseCategory, expenseCurrency].filter(Boolean).length,
            list: [
              ...(dateFrom || dateTo ? [`Date: ${dateFrom || 'Start'} to ${dateTo || 'End'}`] : []),
              ...(status ? [`Status: ${status}`] : []),
              ...(customerId ? [`Customer: ${customerId}`] : []),
              ...(createdBy ? [`Created By: ${createdBy}`] : []),
              ...(currency ? [`Currency: ${currency}`] : []),
              ...(expenseStatus ? [`Expense Status: ${expenseStatus}`] : []),
              ...(expenseCategory ? [`Expense Category: ${expenseCategory}`] : []),
              ...(expenseCurrency ? [`Expense Currency: ${expenseCurrency}`] : [])
            ],
            currencyBreakdown: analytics.currencySummaries ? analytics.currencySummaries.map(c => ({
              currency: c.currency,
              invoices: c.totalInvoices,
              amount: c.totalAmount,
              profit: c.totalProfitWithoutVAT
            })) : []
          },
          
          // Query metadata
          query: {
            totalInvoices: analytics.summary.totalInvoices,
            hasData: analytics.summary.totalInvoices > 0,
            timeSeriesPoints: analytics.timeSeries.length,
            currencyTimeSeriesPoints: analytics.currencyTimeSeries.length,
            currenciesFound: analytics.currencySummaries ? analytics.currencySummaries.length : 0,
            currencyList: analytics.currencySummaries ? analytics.currencySummaries.map(c => c.currency) : []
          }
        }
      };
    } catch (error) {
      console.error('Error getting total sales:', error);
      throw error;
    }
  }

  /**
   * Get additional sales analytics
   * @param {Object} baseQuery - Base query for filtering
   * @returns {Promise<Object>} Additional analytics data
   */
  async getAdditionalSalesAnalytics(baseQuery) {
    try {
      // Top customers by sales and profit
      const topCustomers = await CustomerInvoice.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$customer.custId',
            customerName: { $first: '$customer.name' },
            totalAmount: { $sum: '$totalAmount' },
            invoiceCount: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
      ]);

      // Sales by status
      const salesByStatus = await CustomerInvoice.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Sales by currency
      const salesByCurrency = await CustomerInvoice.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$currency',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Sales by exportTo (filter out null values)
      const salesByExportTo = await CustomerInvoice.aggregate([
        { 
          $match: {
            ...baseQuery,
            exportTo: { $ne: null, $exists: true }
          }
        },
        {
          $group: {
            _id: '$exportTo',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Monthly trend (last 12 months)
      const monthlyTrend = await CustomerInvoice.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]);

      return {
        topCustomers,
        salesByStatus,
        salesByCurrency,
        salesByExportTo,
        monthlyTrend
      };
    } catch (error) {
      console.error('Error getting additional analytics:', error);
      return {
        topCustomers: [],
        salesByStatus: [],
        salesByCurrency: [],
        salesByExportTo: [],
        monthlyTrend: []
      };
    }
  }

  /**
   * Get expense analytics for the same period as sales analytics
   * @param {Object} baseQuery - Base query for filtering (date range, etc.)
   * @param {Object} expenseFilters - Expense-specific filters
   * @returns {Promise<Object>} Expense analytics data
   */
  async getExpenseAnalytics(baseQuery, expenseFilters = {}) {
    try {
      const { expenseStatus, expenseCategory, expenseCurrency } = expenseFilters;
      
      // Extract date range from baseQuery for expenses
      const expenseQuery = {};
      if (baseQuery.createdAt) {
        expenseQuery.createdAt = baseQuery.createdAt;
      }
      
      // Apply expense-specific filters
      if (expenseStatus) expenseQuery.status = expenseStatus;
      if (expenseCategory) expenseQuery.category = expenseCategory;
      if (expenseCurrency) expenseQuery.currency = expenseCurrency;

      // Get total expenses by currency
      const expensesByCurrency = await Expense.aggregate([
        { 
          $match: {
            ...expenseQuery,
            status: { $in: ['approved', 'paid'] } // Only count approved/paid expenses
          }
        },
        {
          $group: {
            _id: '$currency',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Get expenses by category
      const expensesByCategory = await Expense.aggregate([
        { 
          $match: {
            ...expenseQuery,
            status: { $in: ['approved', 'paid'] }
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
      ]);

      // Get expenses by status
      const expensesByStatus = await Expense.aggregate([
        { $match: expenseQuery },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Calculate total expenses across all currencies
      const totalExpenses = expensesByCurrency.reduce((sum, expense) => sum + expense.totalAmount, 0);

      return {
        totalExpenses,
        expensesByCurrency,
        expensesByCategory,
        expensesByStatus
      };
    } catch (error) {
      console.error('Error getting expense analytics:', error);
      return {
        totalExpenses: 0,
        expensesByCurrency: [],
        expensesByCategory: [],
        expensesByStatus: []
      };
    }
  }
}

module.exports = new CustomerInvoiceService();
