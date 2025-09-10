const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate } = require('../middlewares/auth');
const { hasPermission, isAdmin, isEmployeeOrAdmin } = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Public routes (no authentication required)
router.get('/search', companyController.searchCompanies);

// Protected routes (authentication required)
router.use(authenticate);

// Company CRUD operations
router.post('/', 
  hasPermission('company:create'),
  validate(schemas.createCompany),
  companyController.createCompany
);

router.get('/', 
  hasPermission('company:read'),
  companyController.getCompanies
);

router.get('/stats', 
  hasPermission('company:read'),
  companyController.getCompanyStats
);

router.get('/industry/:industry', 
  hasPermission('company:read'),
  companyController.getCompaniesByIndustry
);

router.get('/status/:status', 
  hasPermission('company:read'),
  companyController.getCompaniesByStatus
);

router.get('/code/:code', 
  hasPermission('company:read'),
  companyController.getCompanyByCode
);

router.get('/:id', 
  hasPermission('company:read'),
  companyController.getCompanyById
);

router.put('/:id', 
  hasPermission('company:update'),
  validate(schemas.updateCompany),
  companyController.updateCompany
);

router.delete('/:id', 
  hasPermission('company:delete'),
  companyController.deleteCompany
);

// Company status management
router.patch('/:id/status', 
  hasPermission('company:update'),
  validate(schemas.updateCompanyStatus),
  companyController.updateCompanyStatus
);

// Contact management
router.post('/:id/contacts', 
  hasPermission('company:update'),
  validate(schemas.addContact),
  companyController.addContact
);

router.put('/:id/contacts/:contactId', 
  hasPermission('company:update'),
  validate(schemas.updateContact),
  companyController.updateContact
);

router.delete('/:id/contacts/:contactId', 
  hasPermission('company:update'),
  companyController.removeContact
);

// Bulk operations (admin only)
router.post('/bulk-update', 
  isAdmin,
  validate(schemas.bulkUpdateCompanies),
  companyController.bulkUpdateCompanies
);

// Owner company management (your company selling products)
router.get('/owner/company', 
  hasPermission('company:read'),
  companyController.getOwnerCompany
);

router.get('/owner/company/documents', 
  hasPermission('company:read'),
  companyController.getCompanyForDocuments
);

router.patch('/owner/company/:id', 
  isAdmin,
  companyController.setOwnerCompany
);

module.exports = router;
