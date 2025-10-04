const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const { hasPermission, isAdmin } = require('../middlewares/authorization');
const schemas = require('../middlewares/validation').schemas;

// Apply authentication middleware to all routes
router.use(authenticate);

// Receipt CRUD operations
router.get('/', hasPermission('receipt:read'), receiptController.getAllReceipts);
router.get('/summary', hasPermission('receipt:read'), receiptController.getReceiptSummary);
router.get('/:id', hasPermission('receipt:read'), receiptController.getReceiptById);
router.post('/', hasPermission('receipt:create'), validate(schemas.createReceipt), receiptController.createReceipt);
router.put('/:id', hasPermission('receipt:update'), validate(schemas.updateReceipt), receiptController.updateReceipt);
router.delete('/:id', hasPermission('receipt:delete'), receiptController.deleteReceipt);

// Filtered queries
router.get('/customer/:customerId', hasPermission('receipt:read'), receiptController.getReceiptsByCustomer);

module.exports = router;
