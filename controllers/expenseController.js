const expenseService = require('../services/expenseService');
const { asyncHandler } = require('../middlewares/errorHandler');

class ExpenseController {
  // Get all expenses
  getAllExpenses = asyncHandler(async (req, res) => {
    const filters = req.query;
    const result = await expenseService.getAllExpenses(filters);

    res.status(200).json({
      success: true,
      message: 'Expenses retrieved successfully',
      data: result
    });
  });

  // Get expense by ID
  getExpenseById = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const expense = await expenseService.getExpenseById(expenseId);

    res.status(200).json({
      success: true,
      message: 'Expense retrieved successfully',
      data: expense
    });
  });

  // Create new expense
  createExpense = asyncHandler(async (req, res) => {
    const expenseData = req.body;
    const createdBy = req.user._id;

    const expense = await expenseService.createExpense(expenseData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  });

  // Update expense
  updateExpense = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const expense = await expenseService.updateExpense(expenseId, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  });

  // Delete expense
  deleteExpense = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const result = await expenseService.deleteExpense(expenseId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        expenseId: result.expenseId
      }
    });
  });

  // Approve expense
  approveExpense = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const { approvalNotes } = req.body;
    const approvedBy = req.user._id;

    const expense = await expenseService.approveExpense(expenseId, approvedBy, approvalNotes);

    res.status(200).json({
      success: true,
      message: 'Expense approved successfully',
      data: expense
    });
  });

  // Reject expense
  rejectExpense = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const { rejectionNotes } = req.body;
    const rejectedBy = req.user._id;

    const expense = await expenseService.rejectExpense(expenseId, rejectedBy, rejectionNotes);

    res.status(200).json({
      success: true,
      message: 'Expense rejected successfully',
      data: expense
    });
  });

  // Mark expense as paid
  markAsPaid = asyncHandler(async (req, res) => {
    const expenseId = req.params.id;
    const paidBy = req.user._id;

    const expense = await expenseService.markAsPaid(expenseId, paidBy);

    res.status(200).json({
      success: true,
      message: 'Expense marked as paid successfully',
      data: expense
    });
  });

  // Get expenses by category
  getExpensesByCategory = asyncHandler(async (req, res) => {
    const category = req.params.category;
    const expenses = await expenseService.getExpensesByCategory(category);

    res.status(200).json({
      success: true,
      message: `Expenses for category '${category}' retrieved successfully`,
      data: expenses
    });
  });

  // Get expenses by status
  getExpensesByStatus = asyncHandler(async (req, res) => {
    const status = req.params.status;
    const expenses = await expenseService.getExpensesByStatus(status);

    res.status(200).json({
      success: true,
      message: `Expenses with status '${status}' retrieved successfully`,
      data: expenses
    });
  });

  // Get expense summary
  getExpenseSummary = asyncHandler(async (req, res) => {
    const filters = req.query;
    const summary = await expenseService.calculateExpenseSummary(filters);

    res.status(200).json({
      success: true,
      message: 'Expense summary retrieved successfully',
      data: summary
    });
  });

  // Get total expenses in date range
  getTotalExpensesInRange = asyncHandler(async (req, res) => {
    const { startDate, endDate, currency } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const result = await expenseService.getTotalExpensesInRange(
      new Date(startDate),
      new Date(endDate),
      currency || 'AED'
    );

    res.status(200).json({
      success: true,
      message: 'Total expenses in range retrieved successfully',
      data: result
    });
  });
}

module.exports = new ExpenseController();
