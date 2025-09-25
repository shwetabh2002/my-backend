const express = require('express');
const router = express.Router();
const customerInvoiceController = require('../controllers/customerInvoiceController');
const { authenticate } = require('../middlewares/auth');
const { hasPermission } = require('../middlewares/authorization');

// Apply authentication to all routes
router.use(authenticate);

// Get all customer invoices
router.get('/', 
  hasPermission('invoice:read'),
  customerInvoiceController.getAllInvoices
);

module.exports = router;
