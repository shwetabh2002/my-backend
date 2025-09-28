const express = require('express');
const router = express.Router();
const customerInvoiceController = require('../controllers/customerInvoiceController');
const { authenticate } = require('../middlewares/auth');
const { hasPermission } = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Apply authentication to all routes
router.use(authenticate);

// Get all customer invoices
router.get('/', 
  hasPermission('invoice:read'),
  customerInvoiceController.getAllInvoices
);

// Get invoice by ID
router.get('/:id', 
  hasPermission('invoice:read'),
  customerInvoiceController.getInvoiceById
);

// Create customer invoice
router.post('/', 
  hasPermission('invoice:create'),
  validate(schemas.createCustomerInvoice),
  customerInvoiceController.createCustomerInvoice
);

module.exports = router;
