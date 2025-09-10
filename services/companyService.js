const Company = require('../models/Company');
const { createError } = require('../utils/apiError');

class CompanyService {
  /**
   * Create a new company
   * @param {Object} companyData - Company data
   * @param {string} createdBy - User ID who created the company
   * @returns {Promise<Object>} Created company
   */
  async createCompany(companyData, createdBy) {
    try {
      // Check for duplicate email
      const existingCompany = await Company.findOne({ 
        email: companyData.email 
      });
      
      if (existingCompany) {
        throw createError.conflict('Company with this email already exists');
      }

      // Check for duplicate tax ID if provided
      if (companyData.taxId) {
        const existingTaxId = await Company.findOne({ 
          taxId: companyData.taxId 
        });
        
        if (existingTaxId) {
          throw createError.conflict('Company with this tax ID already exists');
        }
      }

      // Check for duplicate registration number if provided
      if (companyData.registrationNumber) {
        const existingRegNumber = await Company.findOne({ 
          registrationNumber: companyData.registrationNumber 
        });
        
        if (existingRegNumber) {
          throw createError.conflict('Company with this registration number already exists');
        }
      }

      const company = new Company({
        ...companyData,
        createdBy
      });

      await company.save();
      return company;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Get all companies with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, sort, etc.)
   * @returns {Promise<Object>} Paginated companies
   */
  async getCompanies(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        search,
        status,
        industry,
        businessType,
        priority,
        customerTier,
        createdBy,
        dateFrom,
        dateTo
      } = options;

      // Build query
      const query = {};

      if (status) query.status = status;
      if (industry) query.industry = new RegExp(industry, 'i');
      if (businessType) query.businessType = businessType;
      if (priority) query.priority = priority;
      if (customerTier) query.customerTier = customerTier;
      if (createdBy) query.createdBy = createdBy;

      // Date range filter
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // Search functionality
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { legalName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { companyCode: new RegExp(search, 'i') },
          { 'contacts.name': new RegExp(search, 'i') },
          { 'contacts.email': new RegExp(search, 'i') }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;
      const limitNum = parseInt(limit);

      // Execute query with pagination
      const companies = await Company.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await Company.countDocuments(query);

      return {
        companies,
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
      throw createError.internal('Failed to fetch companies');
    }
  }

  /**
   * Get company by ID
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company details
   */
  async getCompanyById(companyId) {
    try {
      const company = await Company.findById(companyId)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!company) {
        throw createError.notFound('Company not found');
      }

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Update company
   * @param {string} companyId - Company ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated the company
   * @returns {Promise<Object>} Updated company
   */
  async updateCompany(companyId, updateData, updatedBy) {
    try {
      // Check for duplicate email (excluding current company)
      if (updateData.email) {
        const existingCompany = await Company.findOne({ 
          email: updateData.email,
          _id: { $ne: companyId }
        });
        
        if (existingCompany) {
          throw createError.conflict('Company with this email already exists');
        }
      }

      // Check for duplicate tax ID (excluding current company)
      if (updateData.taxId) {
        const existingTaxId = await Company.findOne({ 
          taxId: updateData.taxId,
          _id: { $ne: companyId }
        });
        
        if (existingTaxId) {
          throw createError.conflict('Company with this tax ID already exists');
        }
      }

      // Check for duplicate registration number (excluding current company)
      if (updateData.registrationNumber) {
        const existingRegNumber = await Company.findOne({ 
          registrationNumber: updateData.registrationNumber,
          _id: { $ne: companyId }
        });
        
        if (existingRegNumber) {
          throw createError.conflict('Company with this registration number already exists');
        }
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
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
       .populate('updatedBy', 'name email');

      if (!company) {
        throw createError.notFound('Company not found');
      }

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete company
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCompany(companyId) {
    try {
      const company = await Company.findByIdAndDelete(companyId);

      if (!company) {
        throw createError.notFound('Company not found');
      }

      return { message: 'Company deleted successfully' };
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Update company status
   * @param {string} companyId - Company ID
   * @param {string} status - New status
   * @param {string} updatedBy - User ID who updated the status
   * @returns {Promise<Object>} Updated company
   */
  async updateCompanyStatus(companyId, status, updatedBy) {
    try {
      const validStatuses = ['active', 'inactive', 'suspended', 'pending', 'archived'];
      
      if (!validStatuses.includes(status)) {
        throw createError.badRequest('Invalid status. Must be one of: ' + validStatuses.join(', '));
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        { 
          status,
          updatedBy,
          lastActivityDate: new Date()
        },
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email');

      if (!company) {
        throw createError.notFound('Company not found');
      }

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Add contact to company
   * @param {string} companyId - Company ID
   * @param {Object} contactData - Contact data
   * @param {string} updatedBy - User ID who added the contact
   * @returns {Promise<Object>} Updated company
   */
  async addContact(companyId, contactData, updatedBy) {
    try {
      const company = await Company.findById(companyId);

      if (!company) {
        throw createError.notFound('Company not found');
      }

      // Check for duplicate contact email
      const existingContact = company.contacts.find(
        contact => contact.email === contactData.email
      );

      if (existingContact) {
        throw createError.conflict('Contact with this email already exists');
      }

      company.contacts.push(contactData);
      company.updatedBy = updatedBy;
      company.lastActivityDate = new Date();

      await company.save();

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Update contact in company
   * @param {string} companyId - Company ID
   * @param {string} contactId - Contact ID
   * @param {Object} contactData - Updated contact data
   * @param {string} updatedBy - User ID who updated the contact
   * @returns {Promise<Object>} Updated company
   */
  async updateContact(companyId, contactId, contactData, updatedBy) {
    try {
      const company = await Company.findById(companyId);

      if (!company) {
        throw createError.notFound('Company not found');
      }

      const contact = company.contacts.id(contactId);
      if (!contact) {
        throw createError.notFound('Contact not found');
      }

      // Check for duplicate contact email (excluding current contact)
      const existingContact = company.contacts.find(
        c => c.email === contactData.email && c._id.toString() !== contactId
      );

      if (existingContact) {
        throw createError.conflict('Contact with this email already exists');
      }

      Object.assign(contact, contactData);
      company.updatedBy = updatedBy;
      company.lastActivityDate = new Date();

      await company.save();

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Remove contact from company
   * @param {string} companyId - Company ID
   * @param {string} contactId - Contact ID
   * @param {string} updatedBy - User ID who removed the contact
   * @returns {Promise<Object>} Updated company
   */
  async removeContact(companyId, contactId, updatedBy) {
    try {
      const company = await Company.findById(companyId);

      if (!company) {
        throw createError.notFound('Company not found');
      }

      const contact = company.contacts.id(contactId);
      if (!contact) {
        throw createError.notFound('Contact not found');
      }

      contact.remove();
      company.updatedBy = updatedBy;
      company.lastActivityDate = new Date();

      await company.save();

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Search companies
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchCompanies(searchTerm, options = {}) {
    try {
      const { limit = 20 } = options;

      const companies = await Company.searchCompanies(searchTerm)
        .populate('createdBy', 'name email')
        .limit(parseInt(limit))
        .lean();

      return companies;
    } catch (error) {
      throw createError.internal('Search failed');
    }
  }

  /**
   * Get company statistics
   * @returns {Promise<Object>} Company statistics
   */
  async getCompanyStats() {
    try {
      const stats = await Company.getCompanyStats();
      
      if (stats.length === 0) {
        return {
          totalCompanies: 0,
          activeCompanies: 0,
          inactiveCompanies: 0,
          suspendedCompanies: 0,
          byIndustry: {},
          byTier: {}
        };
      }

      const result = stats[0];
      
      // Process industry stats
      const industryStats = {};
      result.byIndustry.forEach(item => {
        if (!industryStats[item.industry]) {
          industryStats[item.industry] = { total: 0, active: 0, inactive: 0, suspended: 0 };
        }
        industryStats[item.industry].total++;
        industryStats[item.industry][item.status]++;
      });

      // Process tier stats
      const tierStats = {};
      result.byTier.forEach(item => {
        if (!tierStats[item.tier]) {
          tierStats[item.tier] = { total: 0, active: 0, inactive: 0, suspended: 0 };
        }
        tierStats[item.tier].total++;
        tierStats[item.tier][item.status]++;
      });

      return {
        totalCompanies: result.totalCompanies,
        activeCompanies: result.activeCompanies,
        inactiveCompanies: result.inactiveCompanies,
        suspendedCompanies: result.suspendedCompanies,
        byIndustry: industryStats,
        byTier: tierStats
      };
    } catch (error) {
      throw createError.internal('Failed to fetch company statistics');
    }
  }

  /**
   * Get companies by industry
   * @param {string} industry - Industry name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Companies in industry
   */
  async getCompaniesByIndustry(industry, options = {}) {
    try {
      const { limit = 50 } = options;

      const companies = await Company.findByIndustry(industry)
        .populate('createdBy', 'name email')
        .limit(parseInt(limit))
        .lean();

      return companies;
    } catch (error) {
      throw createError.internal('Failed to fetch companies by industry');
    }
  }

  /**
   * Get companies by status
   * @param {string} status - Company status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Companies with status
   */
  async getCompaniesByStatus(status, options = {}) {
    try {
      const { limit = 50 } = options;

      const companies = await Company.findByStatus(status)
        .populate('createdBy', 'name email')
        .limit(parseInt(limit))
        .lean();

      return companies;
    } catch (error) {
      throw createError.internal('Failed to fetch companies by status');
    }
  }

  /**
   * Bulk update companies
   * @param {Array} companyIds - Array of company IDs
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who performed the update
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdateCompanies(companyIds, updateData, updatedBy) {
    try {
      const result = await Company.updateMany(
        { _id: { $in: companyIds } },
        { 
          ...updateData, 
          updatedBy,
          lastActivityDate: new Date()
        }
      );

      return {
        message: `${result.modifiedCount} companies updated successfully`,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      throw createError.internal('Bulk update failed');
    }
  }

  /**
   * Get company by company code
   * @param {string} companyCode - Company code
   * @returns {Promise<Object>} Company details
   */
  async getCompanyByCode(companyCode) {
    try {
      const company = await Company.findOne({ companyCode })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!company) {
        throw createError.notFound('Company not found');
      }

      return company;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the owner company (the company selling products)
   * @returns {Promise<Object>} Owner company details
   */
  async getOwnerCompany() {
    try {
      // Look for company with a special flag or specific company code
      let company = await Company.findOne({ isOwner: true })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      // If no owner company found, get the first company or create a default one
      if (!company) {
        company = await Company.findOne()
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      if (!company) {
        throw createError.notFound('Owner company not found. Please create a company first.');
      }

      return company;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set a company as the owner company
   * @param {string} companyId - Company ID to set as owner
   * @param {string} updatedBy - User ID who made the change
   * @returns {Promise<Object>} Updated company
   */
  async setOwnerCompany(companyId, updatedBy) {
    try {
      // First, remove owner flag from all companies
      await Company.updateMany({}, { isOwner: false });

      // Set the specified company as owner
      const company = await Company.findByIdAndUpdate(
        companyId,
        { 
          isOwner: true,
          updatedBy,
          lastActivityDate: new Date()
        },
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('updatedBy', 'name email');

      if (!company) {
        throw createError.notFound('Company not found');
      }

      return company;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid company ID format');
      }
      throw error;
    }
  }

  /**
   * Get company details for use in invoices, quotations, etc.
   * @returns {Promise<Object>} Simplified company details for business documents
   */
  async getCompanyForDocuments() {
    try {
      const company = await this.getOwnerCompany();
      
      // Return only the fields needed for business documents
      return {
        name: company.name,
        legalName: company.legalName,
        companyCode: company.companyCode,
        email: company.email,
        phone: company.phone,
        fax: company.fax,
        website: company.website,
        address: company.address,
        billingAddress: company.billingAddress,
        taxId: company.taxId,
        registrationNumber: company.registrationNumber,
        currency: company.currency,
        paymentTerms: company.paymentTerms,
        socialMedia: company.socialMedia,
        termCondition:company.termCondition
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CompanyService();
