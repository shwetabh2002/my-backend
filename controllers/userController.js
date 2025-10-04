const userService = require('../services/userService');
const { asyncHandler } = require('../middlewares/errorHandler');

class UserController {
  // Create new user (admin only)
  createUser = asyncHandler(async (req, res) => {
    const userData = req.body;

    const user = await userService.createUser(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  });

  // Get all users with pagination and filters
  getUsers = asyncHandler(async (req, res) => {
    const query = req.query;
    const currentUser = req.user;

    const result = await userService.getUsers(query, currentUser);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result
    });
  });

  // Get user by ID
  getUserById = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;

    const user = await userService.getUserById(userId, currentUser);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  });

  // Update user (admin only)
  updateUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const updateData = req.body;
    const currentUser = req.user;

    const user = await userService.updateUser(userId, updateData, currentUser);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  });

  // Delete user (admin only)
  deleteUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;

    const result = await userService.deleteUser(userId, currentUser);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: result
    });
  });

  // Get users by role
  getUsersByRole = asyncHandler(async (req, res) => {
    const roleName = req.params.roleName;

    const users = await userService.getUsersByRole(roleName);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  });

  // Update user status (admin only)
  updateUserStatus = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { status } = req.body;
    const currentUser = req.user;

    const user = await userService.updateUserStatus(userId, status, currentUser);

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  });

  // Get user statistics (admin only)
  getUserStats = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    const stats = await userService.getUserStats(currentUser);

    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });
  });

  // Search users
  searchUsers = asyncHandler(async (req, res) => {
    const { search, type, status, roleId } = req.query;
    const currentUser = req.user;

    // Build search query
    const query = {};
    if (search) query.search = search;
    if (type) query.type = type;
    if (status) query.status = status;
    if (roleId) query.roleId = roleId;

    const result = await userService.getUsers(query, currentUser);

    res.status(200).json({
      success: true,
      message: 'Users search completed successfully',
      data: result
    });
  });

  createCustomer = asyncHandler(async (req, res) => {
    const userData = req.body;

    const user = await userService.createCustomer(userData);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: user
    });
  });

  // Bulk update users (admin only)
  bulkUpdateUsers = asyncHandler(async (req, res) => {
    const { userIds, updateData } = req.body;
    const currentUser = req.user;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await userService.updateUser(userId, updateData, currentUser);
        results.push(user);
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk update completed',
      data: {
        updated: results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  });

  getCustomers = async (req, res) => {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status
      };
      
      const result = await userService.getCustomers(options);
      
      res.status(200).json({
        success: true,
        message: 'Customers retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  getCustomerById = async (req, res) => {
    try {
      const customerId = req.params.id;
      const customer = await userService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          statusCode: 404
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Customer retrieved successfully',
        data: {
          customer: {
            _id: customer._id,
            custId: customer.custId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            trn: customer.trn,
            type: customer.type,
            isActive: customer.isActive,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            countryCode: customer.countryCode
          },
          quotations: customer.quotations
        }
      });
    } catch (error) {
      console.error('Get customer by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Supplier CRUD methods
  createSupplier = asyncHandler(async (req, res) => {
    const userData = req.body;

    const supplier = await userService.createSupplier(userData);

    res.status(201).json({
      success: true,
      message: 'Supplier added successfully',
      data: supplier
    });
  });

  getSuppliers = async (req, res) => {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status
      };
      
      const result = await userService.getSuppliers(options);
      
      res.status(200).json({
        success: true,
        message: 'Suppliers retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get suppliers error:', error);
      
      // Handle ApiError instances
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  getSupplierById = async (req, res) => {
    try {
      const supplierId = req.params.id;
      const supplier = await userService.getSupplierById(supplierId);
      
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
          statusCode: 404
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Supplier retrieved successfully',
        data: supplier
      });
    } catch (error) {
      console.error('Get supplier by ID error:', error);
      
      // Handle ApiError instances
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  updateSupplier = asyncHandler(async (req, res) => {
    const supplierId = req.params.id;
    const updateData = req.body;
    const currentUser = req.user;

    const supplier = await userService.updateSupplier(supplierId, updateData, currentUser);

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  });

  deleteSupplier = asyncHandler(async (req, res) => {
    const supplierId = req.params.id;
    const currentUser = req.user;

    const result = await userService.deleteSupplier(supplierId, currentUser);

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully',
      data: result
    });
  });

  // Delete customer (admin only)
  deleteCustomer = asyncHandler(async (req, res) => {
    const customerId = req.params.id;
    const currentUser = req.user;

    const result = await userService.deleteCustomer(customerId);

    // Check if deletion was blocked due to active quotations
    if (result.success === false) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        customerId: result.customerId,
        customerName: result.customerName,
        deletedAt: result.deletedAt
      }
    });
  });

  // Create employee (admin only)
  createEmployee = asyncHandler(async (req, res) => {
    const employeeData = req.body;
    const currentUser = req.user;

    const result = await userService.createEmployee(employeeData, currentUser._id);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Get all employees (admin and employee access)
  getEmployees = asyncHandler(async (req, res) => {
    const query = req.query;

    const result = await userService.getEmployees(query);

    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: result.employees,
      pagination: result.pagination,
      summary: result.summary
    });
  });

  // Get employee by ID (admin and employee access)
  getEmployeeById = asyncHandler(async (req, res) => {
    const employeeId = req.params.id;

    const result = await userService.getEmployeeById(employeeId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });

  // Delete employee (admin only)
  deleteEmployee = asyncHandler(async (req, res) => {
    const employeeId = req.params.id;
    const currentUser = req.user;

    const result = await userService.deleteEmployee(employeeId);

    // Check if deletion was blocked due to active quotations
    if (result.success === false) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  });
}

module.exports = new UserController();
