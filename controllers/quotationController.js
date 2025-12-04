const quotationService = require('../services/quotationService');

/**
 * Create a new quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createQuotation = async (req, res) => {
  try {
    const quotationData = req.body;
    const createdBy = req.user.id;
    const { companyId } = req.query;
    const quotation = await quotationService.createQuotation(quotationData, createdBy, companyId);
    console.log('Quotation created successfully:', quotation.quotationId);

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation
    });
  } catch (error) {
    console.error('Error in createQuotation controller:', {
      error: error.message,
      statusCode: error.statusCode,
      customerId: req.body.customer?.custId,
      createdBy: req.user?.id,
      stack: error.stack
    });

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get all quotations with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotations = async (req, res) => {
  try {
    const filters = req.query;
    const currentUser = req.user;
    const isAdmin = currentUser?.type === 'admin';
    const { companyId } = req.query;
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort: req.query.sort || '-createdAt',
      search: req.query.search,
      status: req.query.status,
      customerId: req.query.customerId,
      createdBy: req.query.createdBy,
      currency: req.query.currency,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      validTillFrom: req.query.validTillFrom,
      validTillTo: req.query.validTillTo
    };

    const result = await quotationService.getQuotations(filters, options, currentUser, isAdmin, companyId);

    res.status(200).json({
      success: true,
      message: 'Quotations retrieved successfully',
      data: result.quotations,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get quotation by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    const quotation = await quotationService.getQuotationById(id, companyId);

    res.status(200).json({
      success: true,
      message: 'Quotation retrieved successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get quotation by quotation number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotationByNumber = async (req, res) => {
  try {
    const { number } = req.params;
    const { companyId } = req.query;
    const quotation = await quotationService.getQuotationByNumber(number, companyId);

    res.status(200).json({
      success: true,
      message: 'Quotation retrieved successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Update quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user.id;
    const { companyId } = req.query;

    const quotation = await quotationService.updateQuotation(id, updateData, updatedBy, companyId);

    res.status(200).json({
      success: true,
      message: 'Quotation updated successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Delete quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await quotationService.deleteQuotationById(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        quotationId: result.quotationId,
        quotationNumber: result.quotationNumber,
        deletedAt: result.deletedAt
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Update quotation status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateQuotationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBy = req.user.id;

    const quotation = await quotationService.updateQuotationStatus(id, status, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Quotation status updated successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Mark quotation as sent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsSent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.id;

    const quotation = await quotationService.markAsSent(id, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Quotation marked as sent successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Mark quotation as viewed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await quotationService.markAsViewed(id);

    res.status(200).json({
      success: true,
      message: 'Quotation marked as viewed successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Accept quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acceptQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const quotation = await quotationService.acceptQuotation(id, userId);

    res.status(200).json({
      success: true,
      message: 'Quotation accepted successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Reject quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const rejectQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.id;
    const quotation = await quotationService.rejectQuotation(id, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Quotation rejected successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get quotations by customer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotationsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { companyId } = req.query;
    const options = {
      limit: req.query.limit || 50
    };

    const quotations = await quotationService.getQuotationsByCustomer(customerId, options, companyId);

    res.status(200).json({
      success: true,
      message: `Quotations for customer ${customerId} retrieved successfully`,
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get quotations by status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotationsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { companyId } = req.query;
    const options = {
      limit: req.query.limit || 50
    };

    const quotations = await quotationService.getQuotationsByStatus(status, options, companyId);

    res.status(200).json({
      success: true,
      message: `Quotations with ${status} status retrieved successfully`,
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get expired quotations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getExpiredQuotations = async (req, res) => {
  try {
    const { companyId } = req.query;
    const quotations = await quotationService.getExpiredQuotations(companyId);

    res.status(200).json({
      success: true,
      message: 'Expired quotations retrieved successfully',
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get quotations expiring soon
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotationsExpiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 3;
    const { companyId } = req.query;
    const quotations = await quotationService.getQuotationsExpiringSoon(days, companyId);

    res.status(200).json({
      success: true,
      message: `Quotations expiring in the next ${days} days retrieved successfully`,
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Search quotations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchQuotations = async (req, res) => {
  try {
    const { q } = req.query;
    const { companyId } = req.query;
    const options = {
      limit: req.query.limit || 20
    };

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const quotations = await quotationService.searchQuotations(q, options, companyId);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: quotations,
      count: quotations.length
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get quotation statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getQuotationStats = async (req, res) => {
  try {
    const { companyId } = req.query;
    const stats = await quotationService.getQuotationStats(companyId);

    res.status(200).json({
      success: true,
      message: 'Quotation statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Duplicate quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const duplicateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const createdBy = req.user.id;

    const quotation = await quotationService.duplicateQuotation(id, createdBy);

    res.status(201).json({
      success: true,
      message: 'Quotation duplicated successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Convert quotation to order/invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const convertQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.id;

    const quotation = await quotationService.convertQuotation(id, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Quotation converted successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get accepted quotations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAcceptedQuotations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      currency,
      customerId,
      createdBy,
      dateFrom,
      dateTo,
      validTillFrom,
      validTillTo
    } = req.query;

    const { companyId } = req.query;
    const filters = {};
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      search,
      currency,
      customerId,
      createdBy,
      dateFrom,
      dateTo,
      validTillFrom,
      validTillTo
    };

    const result = await quotationService.getAcceptedQuotations(filters, options, companyId);

    res.status(200).json({
      success: true,
      message: 'Accepted Orders fetched successfully',
      data: result.quotations,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Update accepted quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAcceptedQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const quotation = await quotationService.updateAcceptedQuotation(id, updateData, userId);

    res.status(200).json({
      success: true,
      message: 'Accepted order updated successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Send quotation for review
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const quotation = await quotationService.sendReview(id, userId);

    res.status(200).json({
      success: true,
      message: 'Quotation sent for review successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Approve quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const quotation = await quotationService.approveQuotation(id, userId);

    res.status(200).json({
      success: true,
      message: 'Order approved successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
  }


/**
 * Confirm quotation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const confirmQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const quotation = await quotationService.confirmQuotation(id, userId);

    res.status(200).json({
      success: true,
      message: 'Order confirmed successfully',
      data: quotation
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

/**
 * Get review quotations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getReviewOrders = async (req, res) => {
  try {
    const filters = req.query;
    const { companyId } = req.query;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-createdAt'
    };

    const result = await quotationService.getReviewQuotations(filters, options, companyId);

    res.status(200).json({
      success: true,
      message: 'Review Orders retrieved successfully',
      data: result.quotations,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get approved quotations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getApprovedOrders = async (req, res) => {
  try {
    const filters = req.query;
    const { companyId } = req.query;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-createdAt'
    };

    const result = await quotationService.getApprovedOrders(filters, options, companyId);

    res.status(200).json({
      success: true,
      message: 'Approved Orders retrieved successfully',
      data: result.quotations,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get confirmed orders with dynamic filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getConfirmedOrders = async (req, res) => {
  try {
    const currentUser = req.user;
    const isAdmin = currentUser?.type === 'admin';
    
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      currency,
      customerId,
      createdBy,
      dateFrom,
      dateTo,
      validTillFrom,
      validTillTo
    } = req.query;

    const { companyId } = req.query;
    const filters = {};
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      search,
      currency,
      customerId,
      createdBy,
      dateFrom,
      dateTo,
      validTillFrom,
      validTillTo
    };

    const result = await quotationService.getConfirmedOrders(filters, options, currentUser, isAdmin, companyId);

    res.status(200).json({
      success: true,
      message: 'Confirmed Orders fetched successfully',
      data: result.quotations,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Get quotation analytics for dashboard
const getQuotationAnalytics = async (req, res) => {
  try {
    const filters = req.query;
    const { companyId } = req.query;
    const options = {
      groupBy: req.query.groupBy || 'day',
      limit: parseInt(req.query.limit) || 30
    };

    const analyticsData = await quotationService.getQuotationAnalytics(filters, options, companyId);

    res.status(200).json({
      success: true,
      message: 'Quotation analytics retrieved successfully',
      data: analyticsData
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  getQuotationByNumber,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
  markAsSent,
  markAsViewed,
  acceptQuotation,
  rejectQuotation,
  getQuotationsByCustomer,
  getQuotationsByStatus,
  getExpiredQuotations,
  getQuotationsExpiringSoon,
  searchQuotations,
  getQuotationStats,
  duplicateQuotation,
  convertQuotation,
  getAcceptedQuotations,
  updateAcceptedQuotation,
  sendReview,
  approveQuotation,
  confirmQuotation,
  getReviewOrders,
  getApprovedOrders,
  getConfirmedOrders,
  getQuotationAnalytics
};
