const customerInvoiceService = require('../services/customerInvoiceService');

/**
 * Get all customer invoices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllInvoices = async (req, res) => {
  try {
    const filters = req.query;
    const currentUser = req.user;
    const isAdmin = currentUser?.type === 'admin';
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-createdAt'
    };

    const result = await customerInvoiceService.getAllInvoices(filters, options, currentUser, isAdmin);

    res.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully',
      data: result.invoices,
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
 * Create a new customer invoice
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createCustomerInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const createdBy = req.user.id;

    const invoice = await customerInvoiceService.createCustomerInvoice(invoiceData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Customer invoice created successfully',
      data: invoice
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
 * Get invoice by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await customerInvoiceService.getInvoiceById(id);

    res.status(200).json({
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice
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
 * Get total sales analytics for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTotalSales = async (req, res) => {
  try {
    const filters = req.query;
    const options = {
      groupBy: req.query.groupBy || 'day',
      limit: parseInt(req.query.limit) || 30
    };

    const salesData = await customerInvoiceService.getTotalSales(filters, options);

    res.status(200).json({
      success: true,
      message: 'Sales analytics retrieved successfully',
      data: salesData
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

module.exports = {
  getAllInvoices,
  createCustomerInvoice,
  getInvoiceById,
  getTotalSales
};
