const companyService = require('../services/companyService');

/**
 * Create a new company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createCompany = async (req, res) => {
  try {
    const companyData = req.body;
    const createdBy = req.user.id;

    const company = await companyService.createCompany(companyData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company
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
 * Get all companies with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompanies = async (req, res) => {
  try {
    const filters = req.query;
    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort: req.query.sort || '-createdAt',
      search: req.query.search,
      status: req.query.status,
      industry: req.query.industry,
      businessType: req.query.businessType,
      priority: req.query.priority,
      customerTier: req.query.customerTier,
      createdBy: req.query.createdBy,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const result = await companyService.getCompanies(filters, options);

    res.status(200).json({
      success: true,
      message: 'Companies retrieved successfully',
      data: result.companies,
      pagination: result.pagination
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
 * Get company by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await companyService.getCompanyById(id);

    res.status(200).json({
      success: true,
      message: 'Company retrieved successfully',
      data: company
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
 * Update company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user.id;

    const company = await companyService.updateCompany(id, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company
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
 * Delete company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await companyService.deleteCompany(id);

    res.status(200).json({
      success: true,
      message: result.message
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
 * Update company status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBy = req.user.id;

    const company = await companyService.updateCompanyStatus(id, status, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Company status updated successfully',
      data: company
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
 * Add contact to company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;
    const updatedBy = req.user.id;

    const company = await companyService.addContact(id, contactData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Contact added successfully',
      data: company
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
 * Update contact in company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    const contactData = req.body;
    const updatedBy = req.user.id;

    const company = await companyService.updateContact(id, contactId, contactData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: company
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
 * Remove contact from company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    const updatedBy = req.user.id;

    const company = await companyService.removeContact(id, contactId, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Contact removed successfully',
      data: company
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
 * Search companies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchCompanies = async (req, res) => {
  try {
    const { q } = req.query;
    const options = {
      limit: req.query.limit || 20
    };

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const companies = await companyService.searchCompanies(q, options);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: companies,
      count: companies.length
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
 * Get company statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompanyStats = async (req, res) => {
  try {
    const stats = await companyService.getCompanyStats();

    res.status(200).json({
      success: true,
      message: 'Company statistics retrieved successfully',
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
 * Get companies by industry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompaniesByIndustry = async (req, res) => {
  try {
    const { industry } = req.params;
    const options = {
      limit: req.query.limit || 50
    };

    const companies = await companyService.getCompaniesByIndustry(industry, options);

    res.status(200).json({
      success: true,
      message: `Companies in ${industry} industry retrieved successfully`,
      data: companies,
      count: companies.length
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
 * Get companies by status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompaniesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const options = {
      limit: req.query.limit || 50
    };

    const companies = await companyService.getCompaniesByStatus(status, options);

    res.status(200).json({
      success: true,
      message: `Companies with ${status} status retrieved successfully`,
      data: companies,
      count: companies.length
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
 * Bulk update companies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkUpdateCompanies = async (req, res) => {
  try {
    const { companyIds, updateData } = req.body;
    const updatedBy = req.user.id;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company IDs array is required'
      });
    }

    const result = await companyService.bulkUpdateCompanies(companyIds, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
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
 * Get company by company code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompanyByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const company = await companyService.getCompanyByCode(code);

    res.status(200).json({
      success: true,
      message: 'Company retrieved successfully',
      data: company
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
 * Get the owner company (your company selling products)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getOwnerCompany = async (req, res) => {
  try {
    const company = await companyService.getOwnerCompany();

    res.status(200).json({
      success: true,
      message: 'Owner company retrieved successfully',
      data: company
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
 * Set a company as the owner company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const setOwnerCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.id;

    const company = await companyService.setOwnerCompany(id, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Owner company set successfully',
      data: company
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
 * Get company details for business documents (invoices, quotations, etc.)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCompanyForDocuments = async (req, res) => {
  try {
    const company = await companyService.getCompanyForDocuments();

    res.status(200).json({
      success: true,
      message: 'Company details retrieved successfully',
      data: company
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
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  updateCompanyStatus,
  addContact,
  updateContact,
  removeContact,
  searchCompanies,
  getCompanyStats,
  getCompaniesByIndustry,
  getCompaniesByStatus,
  bulkUpdateCompanies,
  getCompanyByCode,
  getOwnerCompany,
  setOwnerCompany,
  getCompanyForDocuments
};
