const customerInvoiceService = require('../services/customerInvoiceService');

/**
 * Get all customer invoices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllInvoices = async (req, res) => {
  try {
    const filters = req.query;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '-createdAt'
    };

    const result = await customerInvoiceService.getAllInvoices(filters, options);

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

module.exports = {
  getAllInvoices
};
