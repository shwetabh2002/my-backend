const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validation');
const { hasPermission, isAdmin } = require('../middlewares/authorization');
const schemas = require('../middlewares/validation').schemas;

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all expenses (with filtering and pagination)
router.get('/', 
  hasPermission('expense:read'), 
  expenseController.getAllExpenses
);

// Get expense by ID
router.get('/:id', 
  hasPermission('expense:read'), 
  expenseController.getExpenseById
);

// Create new expense
router.post('/', 
  hasPermission('expense:create'),
  validate(schemas.createExpense), 
  expenseController.createExpense
);

// Update expense
router.put('/:id', 
  hasPermission('expense:update'),
  validate(schemas.updateExpense), 
  expenseController.updateExpense
);

// Delete expense (only pending expenses can be deleted)
router.delete('/:id', 
  hasPermission('expense:delete'), 
  expenseController.deleteExpense
);

// Approve expense (admin only)
router.patch('/:id/approve', 
  isAdmin, 
  expenseController.approveExpense
);

// Reject expense (admin only)
router.patch('/:id/reject', 
  isAdmin, 
  expenseController.rejectExpense
);

// Mark expense as paid (admin only)
router.patch('/:id/paid', 
  isAdmin, 
  expenseController.markAsPaid
);

// Get expenses by category
router.get('/category/:category', 
  hasPermission('expense:read'), 
  expenseController.getExpensesByCategory
);

// Get expenses by status
router.get('/status/:status', 
  hasPermission('expense:read'), 
  expenseController.getExpensesByStatus
);

// Get expense summary/analytics
router.get('/analytics/summary', 
  hasPermission('expense:read'), 
  expenseController.getExpenseSummary
);

// Get total expenses in date range
router.get('/analytics/total-range', 
  hasPermission('expense:read'), 
  expenseController.getTotalExpensesInRange
);

module.exports = router;
