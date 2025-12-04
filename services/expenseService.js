const Expense = require('../models/Expense');
const { createError } = require('../utils/apiError');

class ExpenseService {
  /**
   * Get all expenses with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (page, limit, sort, etc.)
   * @returns {Promise<Object>} Paginated expenses
   */
  async getAllExpenses(filters = {}, options = {}, companyId = null) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        search,
        category,
        status,
        paymentMethod,
        currency,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        createdBy
      } = { ...filters, ...options };

      // Build query
      const query = {};

      // Filter by companyId if provided
      if (companyId) {
        query.companyId = companyId;
      }

      if (category) query.category = category;
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (currency) query.currency = currency;
      if (createdBy) query.createdBy = createdBy;

      // Date range filters
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // Amount range filters
      if (amountMin !== undefined || amountMax !== undefined) {
        query.amount = {};
        if (amountMin !== undefined) query.amount.$gte = amountMin;
        if (amountMax !== undefined) query.amount.$lte = amountMax;
      }

      // Search functionality
      if (search) {
        query.$or = [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ];
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalExpenses = await Expense.countDocuments(query);

      // Get expenses with pagination
      const expenses = await Expense.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Calculate pagination info
      const totalPages = Math.ceil(totalExpenses / limit);

      // Calculate summary statistics
      const summary = await this.calculateExpenseSummary(query);

      return {
        expenses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalExpenses,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get expense by ID
   * @param {string} expenseId - Expense ID
   * @returns {Promise<Object>} Expense details
   */
  async getExpenseById(expenseId, companyId = null) {
    try {
      const query = { _id: expenseId };
      if (companyId) {
        query.companyId = companyId;
      }
      
      const expense = await Expense.findOne(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('approvedBy', 'name email');

      if (!expense) {
        throw createError.notFound('Expense not found');
      }

      return expense;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid expense ID format');
      }
      throw error;
    }
  }

  /**
   * Create new expense
   * @param {Object} expenseData - Expense data
   * @param {string} createdBy - User ID who created the expense
   * @returns {Promise<Object>} Created expense
   */
  async createExpense(expenseData, createdBy, companyId = null) {
    try {
      const expense = new Expense({
        ...expenseData,
        createdBy,
        ...(companyId && { companyId })
      });

      await expense.save();
      await expense.populate('createdBy', 'name email');

      return expense;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation error: ${errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Update expense by ID
   * @param {string} expenseId - Expense ID
   * @param {Object} updateData - Update data
   * @param {string} updatedBy - User ID who updated the expense
   * @returns {Promise<Object>} Updated expense
   */
  async updateExpense(expenseId, updateData, updatedBy) {
    try {
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        throw createError.notFound('Expense not found');
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          expense[key] = updateData[key];
        }
      });

      expense.updatedBy = updatedBy;

      await expense.save();
      await expense.populate('createdBy', 'name email');
      await expense.populate('updatedBy', 'name email');
      await expense.populate('approvedBy', 'name email');

      return expense;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid expense ID format');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation error: ${errors.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Delete expense by ID
   * @param {string} expenseId - Expense ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteExpense(expenseId) {
    try {
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        throw createError.notFound('Expense not found');
      }

      // Check if expense can be deleted (only pending expenses can be deleted)
      if (expense.status === 'approved') {
        throw createError.badRequest('Only pending and rejected expenses can be deleted');
      }

      await Expense.findByIdAndDelete(expenseId);

      return {
        success: true,
        message: 'Expense deleted successfully',
        expenseId: expense._id
      };
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid expense ID format');
      }
      throw error;
    }
  }

  /**
   * Approve expense
   * @param {string} expenseId - Expense ID
   * @param {string} approvedBy - User ID who approved the expense
   * @param {string} approvalNotes - Approval notes
   * @returns {Promise<Object>} Approved expense
   */
  async approveExpense(expenseId, approvedBy, approvalNotes = '') {
    try {
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        throw createError.notFound('Expense not found');
      }

      if (expense.status !== 'pending') {
        throw createError.badRequest('Only pending expenses can be approved');
      }

      expense.status = 'approved';
      expense.approvedBy = approvedBy;
      expense.approvedAt = new Date();
      expense.approvalNotes = approvalNotes;

      await expense.save();
      await expense.populate('createdBy', 'name email');
      await expense.populate('approvedBy', 'name email');

      return expense;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid expense ID format');
      }
      throw error;
    }
  }

  /**
   * Reject expense
   * @param {string} expenseId - Expense ID
   * @param {string} rejectedBy - User ID who rejected the expense
   * @param {string} rejectionNotes - Rejection notes
   * @returns {Promise<Object>} Rejected expense
   */
  async rejectExpense(expenseId, rejectedBy, rejectionNotes = '') {
    try {
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        throw createError.notFound('Expense not found');
      }

      if (expense.status !== 'pending') {
        throw createError.badRequest('Only pending expenses can be rejected');
      }

      expense.status = 'rejected';
      expense.approvedBy = rejectedBy;
      expense.approvedAt = new Date();
      expense.approvalNotes = rejectionNotes;

      await expense.save();
      await expense.populate('createdBy', 'name email');
      await expense.populate('approvedBy', 'name email');

      return expense;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid expense ID format');
      }
      throw error;
    }
  }

  /**
   * Mark expense as paid
   * @param {string} expenseId - Expense ID
   * @param {string} paidBy - User ID who marked as paid
   * @returns {Promise<Object>} Paid expense
   */
  async markAsPaid(expenseId, paidBy) {
    try {
      const expense = await Expense.findById(expenseId);

      if (!expense) {
        throw createError.notFound('Expense not found');
      }

      if (expense.status !== 'approved') {
        throw createError.badRequest('Only approved expenses can be marked as paid');
      }

      expense.status = 'paid';
      expense.updatedBy = paidBy;

      await expense.save();
      await expense.populate('createdBy', 'name email');
      await expense.populate('updatedBy', 'name email');

      return expense;
    } catch (error) {
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid expense ID format');
      }
      throw error;
    }
  }

  /**
   * Calculate expense summary statistics
   * @param {Object} query - Query filters
   * @returns {Promise<Object>} Summary statistics
   */
  async calculateExpenseSummary(query = {}, companyId = null) {
    try {
      // Build query with companyId filter
      const finalQuery = { ...query };
      if (companyId) {
        finalQuery.companyId = companyId;
      }
      
      // Get all expenses with minimal data - much faster than aggregation
      const expenses = await Expense.find(finalQuery)
        .select('amount status category')
        .lean();

      if (expenses.length === 0) {
        return {
          totalAmount: 0,
          totalExpenses: 0,
          averageAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          byStatus: {},
          byCategory: {}
        };
      }

      // Calculate summary in JavaScript - much faster
      const amounts = expenses.map(exp => exp.amount).filter(amount => amount > 0);
      const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
      const totalExpenses = expenses.length;
      const averageAmount = totalAmount / totalExpenses;
      const minAmount = Math.min(...amounts);
      const maxAmount = Math.max(...amounts);

      // Process status breakdown
      const statusBreakdown = {};
      expenses.forEach(expense => {
        const status = expense.status || 'unknown';
        if (!statusBreakdown[status]) {
          statusBreakdown[status] = { count: 0, amount: 0 };
        }
        statusBreakdown[status].count++;
        statusBreakdown[status].amount += expense.amount || 0;
      });

      // Process category breakdown
      const categoryBreakdown = {};
      expenses.forEach(expense => {
        const category = expense.category || 'unknown';
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { count: 0, amount: 0 };
        }
        categoryBreakdown[category].count++;
        categoryBreakdown[category].amount += expense.amount || 0;
      });

      return {
        totalAmount,
        totalExpenses,
        averageAmount: Math.round(averageAmount * 100) / 100,
        minAmount,
        maxAmount,
        byStatus: statusBreakdown,
        byCategory: categoryBreakdown
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get expenses by category
   * @param {string} category - Expense category
   * @returns {Promise<Array>} Expenses in category
   */
  async getExpensesByCategory(category, companyId = null) {
    try {
      const query = { category };
      if (companyId) {
        query.companyId = companyId;
      }
      return await Expense.find(query).populate('createdBy', 'name email');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get expenses by status
   * @param {string} status - Expense status
   * @returns {Promise<Array>} Expenses with status
   */
  async getExpensesByStatus(status, companyId = null) {
    try {
      const query = { status };
      if (companyId) {
        query.companyId = companyId;
      }
      return await Expense.find(query).populate('createdBy', 'name email');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get total expenses in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} currency - Currency filter
   * @returns {Promise<Object>} Total expenses
   */
  async getTotalExpensesInRange(startDate, endDate, currency = 'AED', companyId = null) {
    try {
      const query = {
        createdAt: { $gte: startDate, $lte: endDate },
        currency: currency.toUpperCase()
      };
      if (companyId) {
        query.companyId = companyId;
      }
      
      const expenses = await Expense.find(query).select('amount').lean();
      const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      return { totalAmount, count: expenses.length };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ExpenseService();
