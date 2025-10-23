const Quotation = require('../models/quotation');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const Company = require('../models/Company');
const { createError } = require('../utils/apiError');
const currencyService = require('./currencyService');
const receiptService = require('./receiptService');

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
      
      // Convert currency to AED if it's not already AED
      if (quotationData.currency && quotationData.currency.toUpperCase() !== 'AED') {
        console.log(`Converting quotation from ${quotationData.currency} to AED`);
        quotationData = await currencyService.convertQuotationCurrency(quotationData, 'AED');
        console.log('Currency conversion completed');
      } else {
        // Ensure currency is set to AED
        quotationData.currency = 'AED';
      }
      
      // Set default bankCurrency if not provided
      if (!quotationData.bankCurrency) {
        quotationData.bankCurrency = quotationData.currency || 'AED';
      }
      
      const status = 'draft';
      let  statusHistory = [{
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
// const company = await Company.findOne();
// quotationData.termsAndConditions=company.termCondition;
      // Set customer information from user data
      quotationData.customer = {
        userId: customer._id,
        custId: customer.custId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || customer.phone,
        address: customer.address || "no address",
        countryCode: customer.countryCode || "+971",
        trn: customer.trn || null
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

      // Set currency for additional expenses from root level currency
      if (quotationData?.additionalExpenses) {
        quotationData.additionalExpenses.currency = quotationData.currency || 'AED';
        // Ensure amount is set to 0 if not provided
        if (!quotationData.additionalExpenses.amount) {
          quotationData.additionalExpenses.amount = 0;
        }
      }

      // Calculate additional expenses amount
      const additionalExpensesAmount = quotationData.additionalExpenses ? (quotationData.additionalExpenses.amount || 0) : 0;

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
      const vat = await Company.findOne({});
      quotationData.VAT = vat.VAT;
      // Calculate vat amount (on subtotal + additional expenses - discount)
      const taxableAmount = quotationData.subtotal + additionalExpensesAmount - quotationData.totalDiscount;
      // console.log('Calculated taxable amount:', taxableAmount);
      quotationData.vatAmount = quotationData.VAT ? (taxableAmount * quotationData.VAT) / 100 : 0;
      // console.log('Calculated vat amount:', quotationData.vatAmount);

      // Calculate total amount (subtotal + additional expenses - discount + vat)
      quotationData.totalAmount = taxableAmount + quotationData.vatAmount;
      // console.log('Calculated total amount:', quotationData.totalAmount);
      // console.log('Calculated totals - Subtotal:', quotationData.subtotal, 'Total:', quotationData.totalAmount);
      const quotationNumber = `QUO-${year}-${String(newNumber).padStart(6, '0')}`;
      const quotationId = `QID-${year}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;


      // Handle status override - only allow 'booked' status during creation
      let finalStatus = 'draft'; // Default status
      
      if (quotationData.status === 'booked') {
        finalStatus = 'booked';
        // Add status history entry for 'booked' status
        statusHistory = [{
          status: 'booked',
         date: new Date(),
        }];
      }

      // Extract receipt-specific fields (don't store in quotation model)
      const { paymentMethod, description, ...quotationModelData } = quotationData;

      const quotation = new Quotation({
        ...quotationModelData,
        status: finalStatus, // Override status
        statusHistory: statusHistory, // Add status history
        createdBy,
        updatedBy: createdBy,
        quotationNumber: quotationNumber,
        quotationId: quotationId,
      });
      
      
      await this.updateInventoryForQuotation(quotationData.items,'hold');

      await quotation.save();
      console.log('Quotation saved successfully:', quotation.quotationId);
      
      // Update inventory based on quotation items

      // Populate references
      await quotation.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' },
        { path: 'customer.userId', select: 'name email' }
      ]);

            // If quotation status is 'booked', automatically create a receipt
            if (finalStatus === 'booked') {
              try {
                console.log('Creating automatic receipt for booked quotation:', quotation.quotationNumber);
                
                const receiptData = {
                  customerId: quotation.customer.userId,
                  quotationId: quotation._id,
                  paymentMethod: paymentMethod || 'cash', // Use provided paymentMethod or default
                  receiptDate: new Date(),
                  amount: quotation.bookingAmount,
                  currency: quotation.currency,
                  description: description || `Booking payment for quotation ${quotation.quotationNumber}`, // Use provided description or default
                };
      
                const receipt = await receiptService.createReceipt(receiptData, createdBy);
                console.log('Automatic receipt created successfully:', receipt.receiptNumber);
                
                // Add receipt information to quotation response
                quotation.receiptCreated = true;
                quotation.receiptNumber = receipt.receiptNumber;
                quotation.receiptId = receipt._id;
              } catch (receiptError) {
                console.error('Error creating automatic receipt:', receiptError.message);
                // Don't fail the quotation creation if receipt creation fails
                // Just log the error and continue
              }
            }

      return quotation;
    } catch (error) {
      console.error('Error creating quotation:', {
        error: error.message,
        stack: error.stack,
        customerId: quotationData.customer?.custId,
        createdBy,
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
  async getQuotations(filters , options ) {
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
        validTillFrom,
        validTillTo
      } = options;

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
      query.status = { $eq: 'draft' };

      // Execute query with pagination
      const quotations = await Quotation.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.supplierId', 'name email custId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

      // Get total count for pagination
      const total = await Quotation.countDocuments(query);

      // Get summary data for dynamic filters
      const summaryData = await Quotation.aggregate([
        { $match: {} }, // Match all quotations for summary
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
            totalQuotations: { $sum: 1 },
            statuses: { $addToSet: '$status' },
            currencies: { $addToSet: '$currency' },
            customers: { $addToSet: '$customer.custId' },
            creators: { 
              $addToSet: { $arrayElemAt: ['$creatorInfo.name', 0] }
            },
            // Date ranges
            minCreatedDate: { $min: '$createdAt' },
            maxCreatedDate: { $max: '$createdAt' },
            minValidTillDate: { $min: '$validTill' },
            maxValidTillDate: { $max: '$validTill' }
          }
        }
      ]);

      const summary = summaryData[0] || {
        totalQuotations: 0,
        statuses: [],
        currencies: [],
        customers: [],
        creators: [],
        minCreatedDate: null,
        maxCreatedDate: null,
        minValidTillDate: null,
        maxValidTillDate: null
      };

      const result = {
        quotations,
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
            validTillFrom: validTillFrom || null,
            validTillTo: validTillTo || null
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
              validTill: {
                min: summary.minValidTillDate,
                max: summary.maxValidTillDate
              }
            },
            
            // Counts for each filter option
            counts: {
              totalQuotations: summary.totalQuotations || 0
            },
            
            // Sort options
            sortOptions: [
              { value: '-createdAt', label: 'Newest First' },
              { value: 'createdAt', label: 'Oldest First' },
              { value: '-updatedAt', label: 'Recently Updated' },
              { value: 'updatedAt', label: 'Least Recently Updated' },
              { value: '-totalAmount', label: 'Highest Amount' },
              { value: 'totalAmount', label: 'Lowest Amount' },
              { value: 'quotationNumber', label: 'Quotation Number A-Z' },
              { value: '-quotationNumber', label: 'Quotation Number Z-A' }
            ],
            
            // Pagination options
            pageSizes: [5, 10, 25, 50, 100]
          },
          sortBy: sort,
          totalResults: total,
          showingResults: `${quotations.length} of ${total} quotations`
        }
      };

      return result;
    } catch (error) {
      throw createError.internal('Failed to fetch quotations');
    }
  }
  async getApprovedQuotations(filters , options ) {
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
        validTillFrom,
        validTillTo
      } = options;

      // Build query - ALWAYS filter by approved status
      const query = { status: 'approved' };

      if (customerId) query['customer.custId'] = customerId;
      if (createdBy) query.createdBy = createdBy;
      if (currency) query.currency = currency;

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
        .populate('items.supplierId', 'name email custId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)

      // Get total count for pagination
      const total = await Quotation.countDocuments(query);

      // Get summary data for dynamic filters
      const summaryData = await Quotation.aggregate([
        { $match: { status: 'approved' } }, // Match only approved quotations for summary
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
            totalQuotations: { $sum: 1 },
            statuses: { $addToSet: '$status' },
            currencies: { $addToSet: '$currency' },
            customers: { $addToSet: '$customer.custId' },
            creators: { 
              $addToSet: { $arrayElemAt: ['$creatorInfo.name', 0] }
            },
            // Date ranges
            minCreatedDate: { $min: '$createdAt' },
            maxCreatedDate: { $max: '$createdAt' },
            minValidTillDate: { $min: '$validTill' },
            maxValidTillDate: { $max: '$validTill' }
          }
        }
      ]);

      const summary = summaryData[0] || {
        totalQuotations: 0,
        statuses: [],
        currencies: [],
        customers: [],
        creators: [],
        minCreatedDate: null,
        maxCreatedDate: null,
        minValidTillDate: null,
        maxValidTillDate: null
      };

      const result = {
        quotations,
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
            validTillFrom: validTillFrom || null,
            validTillTo: validTillTo || null
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
              validTill: {
                min: summary.minValidTillDate,
                max: summary.maxValidTillDate
              }
            },
            
            // Counts for each filter option
            counts: {
              totalQuotations: summary.totalQuotations || 0
            },
            
            // Sort options
            sortOptions: [
              { value: '-createdAt', label: 'Newest First' },
              { value: 'createdAt', label: 'Oldest First' },
              { value: '-updatedAt', label: 'Recently Updated' },
              { value: 'updatedAt', label: 'Least Recently Updated' },
              { value: '-totalAmount', label: 'Highest Amount' },
              { value: 'totalAmount', label: 'Lowest Amount' },
              { value: 'quotationNumber', label: 'Quotation Number A-Z' },
              { value: '-quotationNumber', label: 'Quotation Number Z-A' }
            ],
            
            // Pagination options
            pageSizes: [5, 10, 25, 50, 100]
          },
          sortBy: sort,
          totalResults: total,
          showingResults: `${quotations.length} of ${total} quotations`
        }
      };

      return result;
    } catch (error) {
      throw createError.internal('Failed to fetch quotations');
    }
  }

  /**
   * Get review quotations (review, approved, confirmed)
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated quotations
   */
  async getReviewQuotations(filters = {}, options = {}) {
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
        validTillFrom,
        validTillTo
      } = { ...filters, ...options };

      // Build query - Default to review, approved, confirmed statuses
      const query = {};

      // Status filter - if provided, use it; otherwise default to review, approved, confirmed
      if (status) {
        // Support single status or array of statuses
        if (Array.isArray(status)) {
          query.status = { $in: status };
        } else {
          query.status = status;
        }
      } else {
        // Default to review, approved, confirmed
        query.status = { $in: ['review', 'approved', 'confirmed','rejected'] };
      }

      if (customerId) query['customer.custId'] = customerId;
      if (createdBy) query.createdBy = createdBy;
      if (currency) query.currency = currency;

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
        .populate('items.supplierId', 'name email custId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)

      // Get total count for pagination
      const total = await Quotation.countDocuments(query);

      // Get summary data for dynamic filters
      const summaryData = await Quotation.aggregate([
        { $match: { status: { $in: ['review', 'approved', 'confirmed','rejected'] } } }, // Match review, approved, confirmed quotations for summary
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
            totalQuotations: { $sum: 1 },
            statuses: { $addToSet: '$status' },
            currencies: { $addToSet: '$currency' },
            customers: { $addToSet: '$customer.custId' },
            creators: { 
              $addToSet: { $arrayElemAt: ['$creatorInfo.name', 0] }
            },
            // Date ranges
            minCreatedDate: { $min: '$createdAt' },
            maxCreatedDate: { $max: '$createdAt' },
            minValidTillDate: { $min: '$validTill' },
            maxValidTillDate: { $max: '$validTill' }
          }
        }
      ]);

      const summary = summaryData[0] || {
        totalQuotations: 0,
        statuses: [],
        currencies: [],
        customers: [],
        creators: [],
        minCreatedDate: null,
        maxCreatedDate: null,
        minValidTillDate: null,
        maxValidTillDate: null
      };

      const result = {
        quotations,
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
            status: status || ['review', 'approved', 'confirmed','rejected'],
            customerId: customerId || null,
            createdBy: createdBy || null,
            currency: currency || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            validTillFrom: validTillFrom || null,
            validTillTo: validTillTo || null
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
              validTill: {
                min: summary.minValidTillDate,
                max: summary.maxValidTillDate
              }
            },
            
            // Counts for each filter option
            counts: {
              totalQuotations: summary.totalQuotations || 0
            },
            
            // Sort options
            sortOptions: [
              { value: '-createdAt', label: 'Newest First' },
              { value: 'createdAt', label: 'Oldest First' },
              { value: '-updatedAt', label: 'Recently Updated' },
              { value: 'updatedAt', label: 'Least Recently Updated' },
              { value: '-totalAmount', label: 'Highest Amount' },
              { value: 'totalAmount', label: 'Lowest Amount' },
              { value: 'quotationNumber', label: 'Quotation Number A-Z' },
              { value: '-quotationNumber', label: 'Quotation Number Z-A' }
            ],
            
            // Pagination options
            pageSizes: [5, 10, 25, 50, 100]
          },
          sortBy: sort,
          totalResults: total,
          showingResults: `${quotations.length} of ${total} quotations`
        }
      };

      return result;
    } catch (error) {
      throw createError.internal('Failed to fetch review orders');
    }
  }

  /**
   * Get status counts for filter summary
   * @returns {Promise<Array>} Status counts
   */
  async getStatusCounts() {
    const counts = await Quotation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    return counts.map(item => ({ value: item._id, count: item.count }));
  }

  /**
   * Get currency counts for filter summary
   * @returns {Promise<Array>} Currency counts
   */
  async getCurrencyCounts() {
    const counts = await Quotation.aggregate([
      { $group: { _id: '$currency', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    return counts.map(item => ({ value: item._id, count: item.count }));
  }

  /**
   * Get customer counts for filter summary
   * @returns {Promise<Array>} Customer counts
   */
  async getCustomerCounts() {
    const counts = await Quotation.aggregate([
      { $group: { _id: '$customer.custId', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    return counts.map(item => ({ value: item._id, count: item.count }));
  }

  /**
   * Get creator counts for filter summary
   * @returns {Promise<Array>} Creator counts
   */
  async getCreatorCounts() {
    const counts = await Quotation.aggregate([
      { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    return counts.map(item => ({ value: item._id, count: item.count }));
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
        .populate('customer.userId', 'name email trn')
        .populate('items.supplierId', 'name email custId')

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      // Fetch company data and add to response
      const company = await Company.findOne();
      // console.log('Company:', company);
      
      // Convert quotation to plain object and add company
      const quotationObj = quotation.toObject();
      if (company) {
        // Create company object with bank details based on quotation currency
        const companyObj = company.toObject();
        
        // Add bank details for the specific bank currency, default to AED
        const bankCurrency = quotationObj.bankCurrency || quotationObj.currency || 'AED';
        if (bankCurrency && companyObj.bankDetails && companyObj.bankDetails.get) {
          const currencyBankDetails = companyObj.bankDetails.get(bankCurrency);
          if (currencyBankDetails) {
            // Use the quotation's bank currency bank details directly
            companyObj.bankDetails = currencyBankDetails;
          } else {
            // If no bank details for this bank currency, use AED as default
            const aedBankDetails = companyObj.bankDetails.get('AED');
            if (aedBankDetails) {
              companyObj.bankDetails = aedBankDetails;
            } else {
              // If no AED bank details available, remove bankDetails
              delete companyObj.bankDetails;
            }
          }
        } else {
          // If no bank currency or bankDetails, try to use AED as default
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
        
        quotationObj.company = companyObj;
      }

      return quotationObj;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      throw error;
    }
  }

  /**
   * Delete quotation by ID (only rejected quotations can be deleted)
   * @param {string} quotationId - Quotation ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteQuotationById(quotationId) {
    try {
      if (!quotationId ) {
        throw createError.badRequest('Invalid quotation ID format');
      }

      // First, find the quotation to check its status
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      // Only allow deletion of rejected quotations
      if (quotation.status !== 'rejected') {
        throw createError.badRequest(`Cannot delete quotation with status '${quotation.status}'. Only rejected quotations can be deleted.`);
      }

      // Delete the quotation
      await Quotation.findByIdAndDelete(quotationId);

      return {
        message: 'Quotation deleted successfully',
        quotationId: quotation.quotationId,
        quotationNumber: quotation.quotationNumber,
        deletedAt: new Date()
      };
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid quotation ID format');
      }
      if (error.statusCode) {
        throw error;
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
        .populate('customer.userId', 'name email trn')
        .populate({
          path: 'items.itemId',
          select: 'name sku sellingPrice description supplierId',
          populate: {
            path: 'supplierId',
            select: 'name email custId',
            model: 'User'
          }
        });

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
        const inventoryIds = updateData.items.map(item => item.itemId);
        const inventoryItems = await Inventory.find({ _id: { $in: inventoryIds } });

        if (inventoryItems.length !== inventoryIds.length) {
          throw createError.badRequest('One or more inventory items not found');
        }

        // Update items with current inventory data
        updateData.items = updateData.items.map(item => {
          const inventoryItem = inventoryItems.find(inv => inv._id.toString() === item.itemId.toString());
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
       .populate('customer.userId', 'name email trn')
       .populate({
         path: 'items.itemId',
         select: 'name sku sellingPrice supplierId',
         populate: {
           path: 'supplierId',
           select: 'name email custId',
           model: 'User'
         }
       });

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
       .populate('customer.userId', 'name email trn');

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
   * Common function to restore inventory when quotation is rejected/cancelled
   * @param {Array} items - Quotation items
   */
  async restoreInventoryForQuotation(items) {
    try {
      
      for (const item of items) {
        if (item.itemId) {
          // Update inventory quantity
          await Inventory.findByIdAndUpdate(
            item.itemId,
            { 
              $inc: { quantity: item.quantity },
              $set: { 
                status: 'active',
                updatedAt: new Date(),
                inStock: true
              }
            }
          );

          // Update VIN numbers status to available
          if (item.vinNumbers && item.vinNumbers.length > 0) {
            for (const vin of item.vinNumbers) {
              await Inventory.updateOne(
                { 
                  _id: item.itemId,
                  'vinNumber.chasisNumber': vin.chasisNumber
                },
                { 
                  $set: { 
                    'vinNumber.$.status': 'active',
                  }
                }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error restoring inventory:', error);
      throw createError.internal('Failed to restore inventory');
    }
  }

  /**
   * Reject quotation
   * @param {string} quotationId - Quotation ID
   * @param {string} updatedBy - User ID who rejected the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async rejectQuotation(quotationId, updatedBy) {
    try {
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      quotation.status = 'rejected';
      quotation.updatedBy = updatedBy;
      quotation.respondedAt = new Date();

      quotation.statusHistory.push({
        status: 'rejected',
        updatedBy: updatedBy,
        updatedAt: new Date()
      });

      await quotation.save();

      // Restore inventory when rejecting
      await this.restoreInventoryForQuotation(quotation.items);

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
        .populate({
          path: 'items.itemId',
          select: 'name sku sellingPrice supplierId',
          populate: {
            path: 'supplierId',
            select: 'name email custId',
            model: 'User'
          }
        })
        .limit(parseInt(limit))
        .sort('-createdAt')

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
        .populate({
          path: 'items.itemId',
          select: 'name sku sellingPrice supplierId',
          populate: {
            path: 'supplierId',
            select: 'name email custId',
            model: 'User'
          }
        })
        .limit(parseInt(limit))
        .sort('-createdAt')

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

      return quotations;
    } catch (error) {
      throw createError.internal('Failed to fetch quotations expiring soon');
    }
  }

  /**
   * Get approved quotations
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated quotations
   */
  async getApprovedOrders(filters = {}, options = {}) {
    try {

      return await this.getApprovedQuotations(filters, options);
    } catch (error) {
      console.error('Error getting approved orders:', error);
      throw createError.internal('Failed to get approved orders');
    }
  }

  /**
   * Get all quotations with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, sort, etc.)
   * @returns {Promise<Object>} Paginated quotations
   */
  async getAcceptedQuotations(filters , options ) {
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
        validTillFrom,
        validTillTo
      } = options;

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
      query.status = { $in: ['accepted', 'approved', 'confirmed','review','rejected','booked'] };

      // Execute query with pagination
      const quotations = await Quotation.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.supplierId', 'name email custId')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

      // Get total count for pagination
      const total = await Quotation.countDocuments(query);

      // Get summary data for dynamic filters
      const summaryData = await Quotation.aggregate([
        { $match: {} }, // Match all quotations for summary
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
            totalQuotations: { $sum: 1 },
            statuses: { $addToSet: '$status' },
            currencies: { $addToSet: '$currency' },
            customers: { $addToSet: '$customer.custId' },
            creators: { 
              $addToSet: { $arrayElemAt: ['$creatorInfo.name', 0] }
            },
            // Date ranges
            minCreatedDate: { $min: '$createdAt' },
            maxCreatedDate: { $max: '$createdAt' },
            minValidTillDate: { $min: '$validTill' },
            maxValidTillDate: { $max: '$validTill' }
          }
        }
      ]);

      const summary = summaryData[0] || {
        totalQuotations: 0,
        statuses: [],
        currencies: [],
        customers: [],
        creators: [],
        minCreatedDate: null,
        maxCreatedDate: null,
        minValidTillDate: null,
        maxValidTillDate: null
      };

      const result = {
        quotations,
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
            validTillFrom: validTillFrom || null,
            validTillTo: validTillTo || null
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
              validTill: {
                min: summary.minValidTillDate,
                max: summary.maxValidTillDate
              }
            },
            
            // Counts for each filter option
            counts: {
              totalQuotations: summary.totalQuotations || 0
            },
            
            // Sort options
            sortOptions: [
              { value: '-createdAt', label: 'Newest First' },
              { value: 'createdAt', label: 'Oldest First' },
              { value: '-updatedAt', label: 'Recently Updated' },
              { value: 'updatedAt', label: 'Least Recently Updated' },
              { value: '-totalAmount', label: 'Highest Amount' },
              { value: 'totalAmount', label: 'Lowest Amount' },
              { value: 'quotationNumber', label: 'order Number A-Z' },
              { value: '-quotationNumber', label: 'order Number Z-A' }
            ],
            
            // Pagination options
            pageSizes: [5, 10, 25, 50, 100]
          },
          sortBy: sort,
          totalResults: total,
          showingResults: `${quotations.length} of ${total} orders`
        }
      };

      return result;
    } catch (error) {
      throw createError.internal('Failed to fetch orders');
    }
  }

  /**
   * Update accepted quotation (only editable fields)
   * @param {string} quotationId - Quotation ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID who is updating
   * @returns {Promise<Object>} Updated quotation
   */
  async updateAcceptedQuotation(quotationId, updateData, userId) {
    try {
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      // Check if quotation is accepted or in review
      if (quotation.status !== 'accepted' && quotation.status !== 'review') {
        throw createError.badRequest('Only accepted or review quotations can be updated');
      }

      // Use all fields from payload (except system fields)
      const filteredUpdateData = { ...updateData };
      
      // Remove system fields that shouldn't be updated directly
      delete filteredUpdateData._id;
      delete filteredUpdateData.createdAt;
      delete filteredUpdateData.createdBy;
      delete filteredUpdateData.quotationId;
      delete filteredUpdateData.quotationNumber;
      
      // Add update metadata
      filteredUpdateData.updatedBy = userId;
      filteredUpdateData.updatedAt = new Date();

      // Recalculate amounts if discount or additionalExpenses are being updated
      if (updateData.discount !== undefined || updateData.additionalExpenses !== undefined) {
        // Get current quotation to use existing subtotal and VAT
        const currentQuotation = await Quotation.findById(quotationId).select('subtotal VAT additionalExpenses');
        
        // Start with current subtotal
        let subtotal = currentQuotation.subtotal;
        
        // Add additional expenses amount
        let additionalExpenseAmount = 0;
        if (updateData.additionalExpenses && updateData.additionalExpenses.amount) {
          additionalExpenseAmount = updateData.additionalExpenses.amount;
        } else if (currentQuotation.additionalExpenses && currentQuotation.additionalExpenses.amount) {
          additionalExpenseAmount = currentQuotation.additionalExpenses.amount;
        }

        // Apply discount
        let discountAmount = 0;
        if (updateData.discount !== undefined && updateData.discount > 0) {
          if (updateData.discountType === 'percentage') {
            discountAmount = (subtotal * updateData.discount) / 100;
          } else {
            discountAmount = updateData.discount;
          }
        }

        // Calculate taxable amount (subtotal + additional expenses - discount)
        const taxableAmount = subtotal + additionalExpenseAmount - discountAmount;

        // Calculate VAT on taxable amount (same as create quotation)
        const vatRate = updateData.VAT || currentQuotation.VAT || 0;
        const vatAmount = vatRate ? (taxableAmount * vatRate) / 100 : 0;

        // Calculate total amount (taxable amount + VAT)
        const totalAmount = taxableAmount + vatAmount;

        // Add calculated amounts to update data
        filteredUpdateData.totalDiscount = discountAmount;
        filteredUpdateData.discountAmount = discountAmount;
        filteredUpdateData.totalAmount = totalAmount;
        filteredUpdateData.vatAmount = vatAmount;
        filteredUpdateData.finalTotal = totalAmount;
      }

      // Update the quotation
      const updatedQuotation = await Quotation.findByIdAndUpdate(
        quotationId,
        { $set: filteredUpdateData },
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email');

      return updatedQuotation;
    } catch (error) {
      console.error('Error updating accepted quotation:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError.internal('Failed to update accepted quotation');
    }
  }

  /**
   * Send quotation for review (change status to review)
   * @param {string} quotationId - Quotation ID
   * @param {string} userId - User ID who is sending for review
   * @returns {Promise<Object>} Updated quotation
   */
  async sendReview(quotationId, userId) {
    try {
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      // Check if quotation can be sent for review
      if (quotation.status === 'review') {
        throw createError.badRequest('Quotation is already under review');
      }

      // Only accepted quotations can be sent for review
      if (quotation.status !== 'accepted' && quotation.status !== 'booked') {
        throw createError.badRequest('Only accepted quotations can be sent for review');
      }

      // Update status and add to history
      quotation.status = 'review';
      quotation.statusHistory.push({
        status: 'review',
        date: new Date(),
        updatedBy: userId
      });
      quotation.updatedBy = userId;

      await quotation.save();

      // Populate the updated quotation
      const updatedQuotation = await Quotation.findById(quotationId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email');

        // await this.updateInventoryForQuotation(updatedQuotation.items,'hold');

      return updatedQuotation;
    } catch (error) {
      console.error('Error sending quotation for review:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError.internal('Failed to send quotation for review');
    }
  }

  /**
   * Accept a quotation (change status to accepted)
   * @param {string} quotationId - Quotation ID
   * @param {string} userId - User ID who is accepting
   * @returns {Promise<Object>} Updated quotation
   */
  async acceptQuotation(quotationId, userId) {
    try {
      const quotation = await Quotation.findById(quotationId);
      
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }

      // Check if quotation is already accepted
      if (quotation.status === 'accepted') {
        throw createError.badRequest('Quotation is already accepted');
      }

      // Update status and add to history
      quotation.status = 'accepted';
      quotation.statusHistory.push({
        status: 'accepted',
        date: new Date(),
        updatedBy: userId
      });
      quotation.updatedBy = userId;

      await quotation.save();

      // Populate the updated quotation
      const updatedQuotation = await Quotation.findById(quotationId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('customer.userId', 'name email')
        .populate('items.supplierId', 'name email custId')
        .populate('statusHistory.updatedBy', 'name email');

        // await this.updateInventoryForQuotation(updatedQuotation.items,'hold');


      return updatedQuotation;
    } catch (error) {
      console.error('Error accepting quotation:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError.internal('Failed to accept quotation');
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
        .populate({
          path: 'items.itemId',
          select: 'name sku sellingPrice supplierId',
          populate: {
            path: 'supplierId',
            select: 'name email custId',
            model: 'User'
          }
        })
        .limit(parseInt(limit))
        .sort('-createdAt')

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
        { path: 'items.itemId', select: 'name sku sellingPrice' }
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
  async updateInventoryForQuotation(items,vinStatus) {
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
              'vinNumber.$[elem].status': vinStatus,
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

  async updateInventoryStatusForQuotation(items,vinStatus) {
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
        
        // Update both VIN status and quantity in a single operation
     const updatedInventory = await Inventory.updateOne(
          { 
            _id: item.itemId,
            'vinNumber.chasisNumber': { $in: vinNumbersToUpdate }
          },
          {
            $set: {
              'vinNumber.$[elem].status': vinStatus,
            }
          },
          {
            arrayFilters: [{ 'elem.chasisNumber': { $in: vinNumbersToUpdate } }]
          }
        );
        // console.log('Updated inventory:', updatedInventory);
        // console.log(`Updated inventory: ${inventoryItem.name} - Quantity: ${inventoryItem.quantity} → ${newQuantity}, VINs set to hold: ${quantityToReduce}`);
      }
      
      console.log('Inventory update completed successfully');
    } catch (error) {
      console.error('Error updating inventory for quotation:', error);
      throw error;
    }
  }

  /**
   * Free up inventory for quotation (when quotation is rejected)
   * @param {Array} items - Quotation items
   */
  async freeUpInventoryForQuotation(items) {
    try {
      console.log('Freeing up inventory for quotation items:', items.length);
  
      for (const item of items) {
        if (!item.itemId) continue;
  
        // Get current inventory item
        const inventoryItem = await Inventory.findById(item.itemId);
        if (!inventoryItem) {
          console.warn(`Inventory item not found: ${item.itemId}`);
          continue;
        }
  
        // Restore quantity
        const newQuantity = inventoryItem.quantity + item.quantity;
        const inStock = newQuantity > 0;
  
        // Base update data
        const updateData = {
          quantity: newQuantity,
          inStock: inStock,
          status: 'active',
        };
  
        if (item.vinNumbers && item.vinNumbers.length > 0) {
          // Ensure vinNumbers are only strings (chasisNumber values)
          const vinNumbersOnly = item.vinNumbers.map(v =>
            typeof v === 'string' ? v : v.chasisNumber
          );
  
          // Update inventory and VIN numbers status together
          await Inventory.findByIdAndUpdate(
            item.itemId,
            {
              $set: {
                ...updateData,
                'vinNumber.$[elem].status': 'active',
              },
            },
            {
              arrayFilters: [
                { 'elem.chasisNumber': { $in: vinNumbersOnly } },
              ],
              new: true,
            }
          );
        } else {
          // Update inventory item without VIN updates
          await Inventory.findByIdAndUpdate(
            item.itemId,
            { $set: updateData },
            { new: true }
          );
        }
  
        console.log(
          `Freed up inventory for item ${item.itemId}: +${item.quantity} quantity, VINs set to active`
        );
      }
    } catch (error) {
      console.error('Error freeing up inventory for quotation:', error);
      throw createError.internal('Failed to free up inventory');
    }
  }
  

  /**
   * Approve quotation
   * @param {string} quotationId - Quotation ID
   * @param {string} userId - User ID who approved the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async approveQuotation(quotationId, userId) {
    try {
      const quotation = await Quotation.findById(quotationId);
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }
      quotation.status = 'approved';
      quotation.statusHistory.push({
        status: 'approved',
        date: new Date(),
        updatedBy: userId
      });
      quotation.updatedBy = userId;
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
   * Confirm quotation
   * @param {string} quotationId - Quotation ID
   * @param {string} userId - User ID who confirmed the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async confirmQuotation(quotationId, userId) {
    try {
      const quotation = await Quotation.findById(quotationId);
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }
      quotation.status = 'confirmed';
      quotation.updatedBy = userId;
      quotation.statusHistory.push({
        status: 'confirmed',
        date: new Date(),
        updatedBy: userId
      });
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
   * Review quotation
   * @param {string} quotationId - Quotation ID
   * @param {string} userId - User ID who reviewed the quotation
   * @returns {Promise<Object>} Updated quotation
   */
  async reviewQuotation(quotationId, userId) {
    try {
      const quotation = await Quotation.findById(quotationId);
      if (!quotation) {
        throw createError.notFound('Quotation not found');
      }
      quotation.status = 'review';
      quotation.updatedBy = userId;
      quotation.statusHistory.push({
        status: 'review',
        date: new Date(),
        updatedBy: userId
        });
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
   * Get approved quotations
   * @param {Object} filters - Filters
   * @param {Object} options - Options
   * @returns {Promise<Object>} Approved quotations
   */
  async getApprovedQuotations(filters = {}, options = {}) {
    try {
      const baseQuery = { status: { $in: ['approved'] } };
      
      // Apply additional filters
      if (filters.customerId) baseQuery['customer.custId'] = filters.customerId;
      if (filters.createdBy) baseQuery.createdBy = filters.createdBy;
      if (filters.currency) baseQuery.currency = filters.currency;
      
      // Date range filters
      if (filters.dateFrom || filters.dateTo) {
        baseQuery.createdAt = {};
        if (filters.dateFrom) baseQuery.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) baseQuery.createdAt.$lte = new Date(filters.dateTo);
      }

      const quotations = await Quotation.find(baseQuery)
        .populate('customer.userId', 'name email')
        .populate('createdBy', 'name email')
        .populate('items.supplierId', 'name email')
        .sort(options.sort || '-createdAt')
        .limit(options.limit || 10)
        .skip(((options.page || 1) - 1) * (options.limit || 10));

        const total = await Quotation.countDocuments(baseQuery);

        // Get summary data for basic filters (similar to getReviewQuotations)
        const summaryData = await Quotation.aggregate([
          { $match: { status: { $in: ['approved'] } } },
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
              totalQuotations: { $sum: 1 },
              statuses: { $addToSet: '$status' },
              currencies: { $addToSet: '$currency' },
              customers: { $addToSet: '$customer.custId' },
              creators: { 
                $addToSet: { $arrayElemAt: ['$creatorInfo.name', 0] }
              },
              minCreatedDate: { $min: '$createdAt' },
              maxCreatedDate: { $max: '$createdAt' }
            }
          }
        ]);

        const summary = summaryData[0] || {
          totalQuotations: 0,
          statuses: [],
          currencies: [],
          customers: [],
          creators: [],
          minCreatedDate: null,
          maxCreatedDate: null
        };

        return {
          quotations,
          pagination: {
            page: options.page || 1,
            limit: options.limit || 10,
            total,
            pages: Math.ceil(total / (options.limit || 10))
          },
          summary: {
            appliedFilters: {
              search: filters.search || null,
              status: 'approved',
              customerId: filters.customerId || null,
              createdBy: filters.createdBy || null,
              currency: filters.currency || null,
              dateFrom: filters.dateFrom || null,
              dateTo: filters.dateTo || null
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
                }
              },
              
              // Counts for each filter option
              counts: {
                totalQuotations: summary.totalQuotations || 0
              },
              
              // Sort options
              sortOptions: [
                { value: '-createdAt', label: 'Newest First' },
                { value: 'createdAt', label: 'Oldest First' },
                { value: '-updatedAt', label: 'Recently Updated' },
                { value: 'updatedAt', label: 'Least Recently Updated' },
                { value: '-totalAmount', label: 'Highest Amount' },
                { value: 'totalAmount', label: 'Lowest Amount' }
              ]
            }
          }
        };
    } catch (error) {
      console.error('Error getting approved quotations:', error);
      throw error;
    }
  }

  /**
   * Calculate quotation analytics for dashboard
   * @param {Array} quotations - Array of quotation documents
   * @param {String} groupBy - Grouping type (day, week, month, year)
   * @param {Number} limit - Limit for time series data
   * @returns {Object} Calculated analytics
   */
  async calculateQuotationAnalytics(quotations, groupBy = 'day', limit = 30) {
    // Initialize status-specific summary counters
    const statusSummaries = new Map();
    const allStatuses = [...new Set(quotations.map(quotation => quotation.status || 'draft'))];
    
    // Initialize summary for each status
    allStatuses.forEach(status => {
      statusSummaries.set(status, {
        status,
        totalQuotations: 0,
        totalAmount: 0,
        totalVatAmount: 0,
        totalSubtotal: 0,
        totalDiscount: 0,
        totalAdditionalExpense: 0,
        totalCostAmount: 0,
        totalSellingAmount: 0,
        totalNetRevenue: 0,
        totalProfitAmount: 0,
        totalProfitWithoutVAT: 0,
        totalProfitWithVAT: 0,
        averageQuotationValue: 0,
        averageProfitPerQuotation: 0,
        averageProfitPerQuotationWithoutVAT: 0,
        averageProfitPerQuotationWithVAT: 0,
        minQuotationValue: 0,
        maxQuotationValue: 0,
        minProfitPerQuotation: 0,
        minProfitPerQuotationWithoutVAT: 0,
        minProfitPerQuotationWithVAT: 0,
        maxProfitPerQuotation: 0,
        maxProfitPerQuotationWithoutVAT: 0,
        maxProfitPerQuotationWithVAT: 0
      });
    });

    // Overall summary (aggregated across all statuses)
    let overallSummary = {
      totalQuotations: 0,
      totalAmount: 0,
      totalVatAmount: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      totalAdditionalExpense: 0,
      totalCostAmount: 0,
      totalSellingAmount: 0,
      totalNetRevenue: 0,
      totalProfitAmount: 0,
      totalProfitWithoutVAT: 0,
      totalProfitWithVAT: 0,
      averageQuotationValue: 0,
      averageProfitPerQuotation: 0,
      averageProfitPerQuotationWithoutVAT: 0,
      averageProfitPerQuotationWithVAT: 0,
      minQuotationValue: 0,
      maxQuotationValue: 0,
      minProfitPerQuotation: 0,
      minProfitPerQuotationWithoutVAT: 0,
      minProfitPerQuotationWithVAT: 0,
      maxProfitPerQuotation: 0,
      maxProfitPerQuotationWithoutVAT: 0,
      maxProfitPerQuotationWithVAT: 0
    };

    // Time series data - overall and status-specific
    const timeSeriesMap = new Map();
    const statusTimeSeriesMap = new Map();
    const profitValues = [];
    const profitValuesWithoutVAT = [];
    const profitValuesWithVAT = [];

    // Fetch current cost prices from inventory for all unique itemIds
    const itemIds = [...new Set(quotations.flatMap(quotation => 
      quotation.items.map(item => item.itemId).filter(id => id)
    ))];
    
    const inventoryItems = await Inventory.find({ 
      _id: { $in: itemIds } 
    }).select('_id costPrice').lean();
    
    // Create a map for quick cost price lookup
    const costPriceMap = new Map();
    inventoryItems.forEach(item => {
      costPriceMap.set(item._id.toString(), item.costPrice || 0);
    });

    // Process each quotation
    quotations.forEach(quotation => {
      const status = quotation.status || 'draft';
      const statusSummary = statusSummaries.get(status);
      
      // Calculate item costs using current inventory cost prices
      const itemCosts = quotation.items.reduce((sum, item) => {
        const currentCostPrice = item.itemId ? 
          (costPriceMap.get(item.itemId.toString()) || 0) : 
          (item.costPrice || 0);
        return sum + (currentCostPrice * (item.quantity || 0));
      }, 0);
      const itemSellingAmount = quotation.items.reduce((sum, item) => 
        sum + (item.totalPrice || 0), 0);

      // Calculate additional expenses
      const additionalExpenseAmount = quotation.additionalExpenses?.amount || 0;
      const totalDiscount = quotation.totalDiscount || 0;
      const vatAmount = quotation.vatAmount || 0;

      // Calculate net revenue and costs
      const netRevenue = itemSellingAmount - totalDiscount;
      const totalCosts = itemCosts + additionalExpenseAmount;
      
      // Calculate profits
      const profitWithoutVAT = netRevenue - totalCosts;
      const profitWithVAT = profitWithoutVAT - vatAmount;

      // Update status-specific summary
      statusSummary.totalQuotations++;
      statusSummary.totalAmount += quotation.totalAmount || 0;
      statusSummary.totalVatAmount += vatAmount;
      statusSummary.totalSubtotal += quotation.subtotal || 0;
      statusSummary.totalDiscount += totalDiscount;
      statusSummary.totalAdditionalExpense += additionalExpenseAmount;
      statusSummary.totalCostAmount += totalCosts;
      statusSummary.totalSellingAmount += itemSellingAmount;
      statusSummary.totalNetRevenue += netRevenue;
      statusSummary.totalProfitAmount += profitWithoutVAT;
      statusSummary.totalProfitWithoutVAT += profitWithoutVAT;
      statusSummary.totalProfitWithVAT += profitWithVAT;

      // Update overall summary
      overallSummary.totalQuotations++;
      overallSummary.totalAmount += quotation.totalAmount || 0;
      overallSummary.totalVatAmount += vatAmount;
      overallSummary.totalSubtotal += quotation.subtotal || 0;
      overallSummary.totalDiscount += totalDiscount;
      overallSummary.totalAdditionalExpense += additionalExpenseAmount;
      overallSummary.totalCostAmount += totalCosts;
      overallSummary.totalSellingAmount += itemSellingAmount;
      overallSummary.totalNetRevenue += netRevenue;
      overallSummary.totalProfitAmount += profitWithoutVAT;
      overallSummary.totalProfitWithoutVAT += profitWithoutVAT;
      overallSummary.totalProfitWithVAT += profitWithVAT;

      // Store profit values for min/max calculations
      profitValues.push(profitWithoutVAT);
      profitValuesWithoutVAT.push(profitWithoutVAT);
      profitValuesWithVAT.push(profitWithVAT);

      // Time series grouping - overall and status-specific
      if (groupBy !== 'none') {
        const date = new Date(quotation.createdAt);
        const timeKey = this.getTimeKey(date, groupBy);
        const statusTimeKey = `${timeKey}_${status}`;
        
        // Overall time series
        if (!timeSeriesMap.has(timeKey)) {
          timeSeriesMap.set(timeKey, {
            _id: this.getTimeGroupingId(date, groupBy),
            date: this.getDateField(date, groupBy),
            totalQuotations: 0,
            totalAmount: 0,
            totalVatAmount: 0,
            totalSubtotal: 0,
            totalDiscount: 0,
            totalAdditionalExpense: 0,
            totalCostAmount: 0,
            totalSellingAmount: 0,
            totalNetRevenue: 0,
            totalProfitAmount: 0,
            totalProfitWithoutVAT: 0,
            totalProfitWithVAT: 0,
            averageQuotationValue: 0,
            averageProfitPerQuotation: 0,
            averageProfitPerQuotationWithoutVAT: 0,
            averageProfitPerQuotationWithVAT: 0
          });
        }

        // Status-specific time series
        if (!statusTimeSeriesMap.has(statusTimeKey)) {
          statusTimeSeriesMap.set(statusTimeKey, {
            _id: this.getTimeGroupingId(date, groupBy),
            date: this.getDateField(date, groupBy),
            status: status,
            totalQuotations: 0,
            totalAmount: 0,
            totalVatAmount: 0,
            totalSubtotal: 0,
            totalDiscount: 0,
            totalAdditionalExpense: 0,
            totalCostAmount: 0,
            totalSellingAmount: 0,
            totalNetRevenue: 0,
            totalProfitAmount: 0,
            totalProfitWithoutVAT: 0,
            totalProfitWithVAT: 0,
            averageQuotationValue: 0,
            averageProfitPerQuotation: 0,
            averageProfitPerQuotationWithoutVAT: 0,
            averageProfitPerQuotationWithVAT: 0
          });
        }

        // Update overall time series
        const timeData = timeSeriesMap.get(timeKey);
        timeData.totalQuotations++;
        timeData.totalAmount += quotation.totalAmount || 0;
        timeData.totalVatAmount += vatAmount;
        timeData.totalSubtotal += quotation.subtotal || 0;
        timeData.totalDiscount += totalDiscount;
        timeData.totalAdditionalExpense += additionalExpenseAmount;
        timeData.totalCostAmount += totalCosts;
        timeData.totalSellingAmount += itemSellingAmount;
        timeData.totalNetRevenue += netRevenue;
        timeData.totalProfitAmount += profitWithoutVAT;
        timeData.totalProfitWithoutVAT += profitWithoutVAT;
        timeData.totalProfitWithVAT += profitWithVAT;

        // Update status-specific time series
        const statusTimeData = statusTimeSeriesMap.get(statusTimeKey);
        statusTimeData.totalQuotations++;
        statusTimeData.totalAmount += quotation.totalAmount || 0;
        statusTimeData.totalVatAmount += vatAmount;
        statusTimeData.totalSubtotal += quotation.subtotal || 0;
        statusTimeData.totalDiscount += totalDiscount;
        statusTimeData.totalAdditionalExpense += additionalExpenseAmount;
        statusTimeData.totalCostAmount += totalCosts;
        statusTimeData.totalSellingAmount += itemSellingAmount;
        statusTimeData.totalNetRevenue += netRevenue;
        statusTimeData.totalProfitAmount += profitWithoutVAT;
        statusTimeData.totalProfitWithoutVAT += profitWithoutVAT;
        statusTimeData.totalProfitWithVAT += profitWithVAT;
      }
    });

    // Calculate averages and min/max for overall summary
    if (overallSummary.totalQuotations > 0) {
      overallSummary.averageQuotationValue = overallSummary.totalAmount / overallSummary.totalQuotations;
      overallSummary.averageProfitPerQuotation = overallSummary.totalProfitAmount / overallSummary.totalQuotations;
      overallSummary.averageProfitPerQuotationWithoutVAT = overallSummary.totalProfitWithoutVAT / overallSummary.totalQuotations;
      overallSummary.averageProfitPerQuotationWithVAT = overallSummary.totalProfitWithVAT / overallSummary.totalQuotations;
    }

    if (profitValues.length > 0) {
      overallSummary.minQuotationValue = Math.min(...quotations.map(q => q.totalAmount || 0));
      overallSummary.maxQuotationValue = Math.max(...quotations.map(q => q.totalAmount || 0));
      overallSummary.minProfitPerQuotation = Math.min(...profitValues);
      overallSummary.minProfitPerQuotationWithoutVAT = Math.min(...profitValuesWithoutVAT);
      overallSummary.minProfitPerQuotationWithVAT = Math.min(...profitValuesWithVAT);
      overallSummary.maxProfitPerQuotation = Math.max(...profitValues);
      overallSummary.maxProfitPerQuotationWithoutVAT = Math.max(...profitValuesWithoutVAT);
      overallSummary.maxProfitPerQuotationWithVAT = Math.max(...profitValuesWithVAT);
    }

    // Calculate averages and min/max for each status
    statusSummaries.forEach(statusSummary => {
      if (statusSummary.totalQuotations > 0) {
        statusSummary.averageQuotationValue = statusSummary.totalAmount / statusSummary.totalQuotations;
        statusSummary.averageProfitPerQuotation = statusSummary.totalProfitAmount / statusSummary.totalQuotations;
        statusSummary.averageProfitPerQuotationWithoutVAT = statusSummary.totalProfitWithoutVAT / statusSummary.totalQuotations;
        statusSummary.averageProfitPerQuotationWithVAT = statusSummary.totalProfitWithVAT / statusSummary.totalQuotations;
      }
    });

    // Process time series data - overall
    const timeSeries = Array.from(timeSeriesMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-limit);

    // Process status-specific time series data
    const statusTimeSeries = Array.from(statusTimeSeriesMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-limit);

    // Calculate averages for overall time series
    timeSeries.forEach(timeData => {
      if (timeData.totalQuotations > 0) {
        timeData.averageQuotationValue = timeData.totalAmount / timeData.totalQuotations;
        timeData.averageProfitPerQuotation = timeData.totalProfitAmount / timeData.totalQuotations;
        timeData.averageProfitPerQuotationWithoutVAT = timeData.totalProfitWithoutVAT / timeData.totalQuotations;
        timeData.averageProfitPerQuotationWithVAT = timeData.totalProfitWithVAT / timeData.totalQuotations;
      }
    });

    // Calculate averages for status-specific time series
    statusTimeSeries.forEach(timeData => {
      if (timeData.totalQuotations > 0) {
        timeData.averageQuotationValue = timeData.totalAmount / timeData.totalQuotations;
        timeData.averageProfitPerQuotation = timeData.totalProfitAmount / timeData.totalQuotations;
        timeData.averageProfitPerQuotationWithoutVAT = timeData.totalProfitWithoutVAT / timeData.totalQuotations;
        timeData.averageProfitPerQuotationWithVAT = timeData.totalProfitWithVAT / timeData.totalQuotations;
      }
    });

    return {
      summary: overallSummary,
      statusSummaries: Array.from(statusSummaries.values()),
      timeSeries: groupBy !== 'none' ? timeSeries : [],
      statusTimeSeries: groupBy !== 'none' ? statusTimeSeries : []
    };
  }

  /**
   * Get additional quotation analytics
   * @param {Object} baseQuery - Base query for filtering
   * @returns {Promise<Object>} Additional analytics data
   */
  async getAdditionalQuotationAnalytics(baseQuery) {
    try {
      // Get all quotations with minimal data - much faster than aggregation
      const quotations = await Quotation.find(baseQuery)
        .select('customer.custId customer.name totalAmount status currency createdAt')
        .lean();

      // Calculate top customers in JavaScript - much faster
      const customerMap = new Map();
      quotations.forEach(quote => {
        const custId = quote.customer?.custId;
        if (custId) {
          if (!customerMap.has(custId)) {
            customerMap.set(custId, {
              _id: custId,
              customerName: quote.customer?.name || 'Unknown',
              totalAmount: 0,
              quotationCount: 0
            });
          }
          const customer = customerMap.get(custId);
          customer.totalAmount += quote.totalAmount || 0;
          customer.quotationCount += 1;
        }
      });
      const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      // Calculate quotations by status in JavaScript
      const statusMap = new Map();
      quotations.forEach(quote => {
        const status = quote.status || 'unknown';
        if (!statusMap.has(status)) {
          statusMap.set(status, {
            _id: status,
            count: 0,
            totalAmount: 0
          });
        }
        const statusData = statusMap.get(status);
        statusData.count += 1;
        statusData.totalAmount += quote.totalAmount || 0;
      });
      const quotationsByStatus = Array.from(statusMap.values());

      // Calculate quotations by currency in JavaScript
      const currencyMap = new Map();
      quotations.forEach(quote => {
        const currency = quote.currency || 'AED';
        if (!currencyMap.has(currency)) {
          currencyMap.set(currency, {
            _id: currency,
            count: 0,
            totalAmount: 0
          });
        }
        const currencyData = currencyMap.get(currency);
        currencyData.count += 1;
        currencyData.totalAmount += quote.totalAmount || 0;
      });
      const quotationsByCurrency = Array.from(currencyMap.values());

      // Calculate monthly trend in JavaScript
      const monthlyMap = new Map();
      quotations.forEach(quote => {
        const date = new Date(quote.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        
        if (!monthlyMap.has(key)) {
          monthlyMap.set(key, {
            _id: { year, month },
            count: 0,
            totalAmount: 0
          });
        }
        const monthData = monthlyMap.get(key);
        monthData.count += 1;
        monthData.totalAmount += quote.totalAmount || 0;
      });
      const monthlyTrend = Array.from(monthlyMap.values())
        .sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year;
          return a._id.month - b._id.month;
        })
        .slice(-12); // Last 12 months

      return {
        topCustomers,
        quotationsByStatus,
        quotationsByCurrency,
        monthlyTrend
      };
    } catch (error) {
      console.error('Error getting additional quotation analytics:', error);
      return {
        topCustomers: [],
        quotationsByStatus: [],
        quotationsByCurrency: [],
        monthlyTrend: []
      };
    }
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
   * Get time grouping ID
   * @param {Date} date - Date to process
   * @param {String} groupBy - Grouping type
   * @returns {Object} Grouping ID
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
   * Get date field for grouping
   * @param {Date} date - Date to process
   * @param {String} groupBy - Grouping type
   * @returns {Date} Date field
   */
  getDateField(date, groupBy) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = Math.ceil(day / 7);

    switch (groupBy) {
      case 'year': return new Date(year, 0, 1);
      case 'month': return new Date(year, month - 1, 1);
      case 'week': return new Date(year, month - 1, Math.ceil(day / 7) * 7 - 6);
      case 'day': 
      default: return new Date(year, month - 1, day);
    }
  }

  /**
   * Get quotation analytics for dashboard
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (dateFrom, dateTo, groupBy, etc.)
   * @returns {Promise<Object>} Quotation analytics data
   */
  async getQuotationAnalytics(filters = {}, options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        status,
        customerId,
        createdBy,
        currency,
        groupBy = 'day', // day, week, month, year
        limit = 30
      } = { ...filters, ...options };

      // Build base query
      const baseQuery = {};
      
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

      // Fetch quotations with minimal data - much more efficient!
      const quotations = await Quotation.find(baseQuery)
        .select('totalAmount vatAmount subtotal totalDiscount additionalExpenses items status createdAt currency customer createdBy')

      // Calculate analytics at code level - much faster and more maintainable
      const analytics = await this.calculateQuotationAnalytics(quotations, groupBy, limit);

      // Get additional analytics
      const additionalAnalytics = await this.getAdditionalQuotationAnalytics(baseQuery);

      return {
        ...analytics,
        additionalAnalytics,
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
            options: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted', 'review', 'approved', 'confirmed', 'completed', 'booked']
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
              quotationCount: c.quotationCount
            })) : []
          },
          
          // User filters
          createdBy: {
            value: createdBy || null,
            applied: !!createdBy,
            options: [],
            availableEmployees: []
          },
          
          // Currency filters
          currency: {
            value: currency || null,
            applied: !!currency,
            options: analytics.statusSummaries ? [...new Set(quotations.map(q => q.currency || 'AED'))] : [],
            availableCurrencies: analytics.statusSummaries ? analytics.statusSummaries.map(s => ({
              currency: s.currency || 'AED',
              totalQuotations: s.totalQuotations,
              totalAmount: s.totalAmount,
              totalProfit: s.totalProfitWithoutVAT
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
            count: [dateFrom, dateTo, status, customerId, createdBy, currency].filter(Boolean).length,
            list: [
              ...(dateFrom || dateTo ? [`Date: ${dateFrom || 'Start'} to ${dateTo || 'End'}`] : []),
              ...(status ? [`Status: ${status}`] : []),
              ...(customerId ? [`Customer: ${customerId}`] : []),
              ...(createdBy ? [`Created By: ${createdBy}`] : []),
              ...(currency ? [`Currency: ${currency}`] : [])
            ],
            statusBreakdown: analytics.statusSummaries ? analytics.statusSummaries.map(s => ({
              status: s.status,
              quotations: s.totalQuotations,
              amount: s.totalAmount,
              profit: s.totalProfitWithoutVAT
            })) : []
          },
          
          // Query metadata
          query: {
            totalQuotations: analytics.summary.totalQuotations,
            hasData: analytics.summary.totalQuotations > 0,
            timeSeriesPoints: analytics.timeSeries.length,
            statusTimeSeriesPoints: analytics.statusTimeSeries.length,
            statusesFound: analytics.statusSummaries ? analytics.statusSummaries.length : 0,
            statusList: analytics.statusSummaries ? analytics.statusSummaries.map(s => s.status) : []
          }
        }
      };
    } catch (error) {
      console.error('Error getting quotation analytics:', error);
      throw error;
    }
  }
}


module.exports = new QuotationService();
