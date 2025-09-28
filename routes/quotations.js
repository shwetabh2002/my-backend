const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middlewares/auth');
const { hasPermission, isAdmin, isEmployeeOrAdmin } = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Public routes (no authentication required)
router.get('/search', quotationController.searchQuotations);

// Protected routes (authentication required)
router.use(authenticate);

// Quotation CRUD operations
router.post('/', 
  hasPermission('quotation:create'),
  validate(schemas.createQuotation),
  quotationController.createQuotation
);

router.get('/', 
  hasPermission('quotation:read'),
  quotationController.getQuotations
);

router.get('/stats', 
  hasPermission('quotation:read'),
  quotationController.getQuotationStats
);

router.get('/expired', 
  hasPermission('quotation:read'),
  quotationController.getExpiredQuotations
);

router.get('/expiring-soon', 
  hasPermission('quotation:read'),
  quotationController.getQuotationsExpiringSoon
);

router.get('/customer/:customerId', 
  hasPermission('quotation:read'),
  quotationController.getQuotationsByCustomer
);

router.get('/status/:status', 
  hasPermission('quotation:read'),
  quotationController.getQuotationsByStatus
);

router.get('/number/:number', 
  hasPermission('quotation:read'),
  quotationController.getQuotationByNumber
);

// Get accepted quotations (must be before /:id route)
router.get('/accepted-orders', 
  hasPermission('quotation:read'),
  quotationController.getAcceptedQuotations
);

router.get('/review-orders', 
  hasPermission('quotation:read'),
  quotationController.getReviewOrders
);

router.get('/approved-orders', 
  hasPermission('quotation:read'),
  quotationController.getApprovedOrders
);

// Update accepted quotation (must be before /:id route)
router.put('/accepted-orders/:id', 
  hasPermission('quotation:update'),
  validate(schemas.updateAcceptedQuotation),
  quotationController.updateAcceptedQuotation
);

// Get quotation analytics for dashboard (must be before /:id route)
router.get('/analytics', 
  hasPermission('quotation:read'),
  quotationController.getQuotationAnalytics
);

router.get('/:id', 
  hasPermission('quotation:read'),
  quotationController.getQuotationById
);

router.put('/:id', 
  hasPermission('quotation:update'),
  validate(schemas.updateQuotation),
  quotationController.updateQuotation
);

router.delete('/:id', 
  hasPermission('quotation:delete'),
  quotationController.deleteQuotation
);

// Quotation status management
router.patch('/:id/status', 
  hasPermission('quotation:update'),
  validate(schemas.updateQuotationStatus),
  quotationController.updateQuotationStatus
);

// Quotation workflow actions
router.patch('/:id/send', 
  hasPermission('quotation:update'),
  quotationController.markAsSent
);

router.patch('/:id/view', 
  quotationController.markAsViewed
);

router.patch('/:id/accept', 
  quotationController.acceptQuotation
);

router.patch('/:id/reject', 
  quotationController.rejectQuotation
);

router.patch('/:id/send-review', 
  quotationController.sendReview
);

router.patch('/:id/convert', 
  hasPermission('quotation:update'),
  quotationController.convertQuotation
);

// Quotation operations
router.post('/:id/duplicate', 
  hasPermission('quotation:create'),
  quotationController.duplicateQuotation
);


router.patch('/:id/approve', 
  hasPermission('quotation:update'),
  quotationController.approveQuotation
);

router.patch('/:id/confirm', 
  hasPermission('quotation:update'),
  quotationController.confirmQuotation
);

module.exports = router;
