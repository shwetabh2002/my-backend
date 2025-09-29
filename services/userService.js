const User = require('../models/User');
const Role = require('../models/Role');
const { getPaginationOptions, createPaginationResponse } = require('../utils/pagination');
const { createError } = require('../utils/apiError');
const Quotation = require('../models/quotation');


class UserService {
  // Create new user
  async createUser(userData) {
    try {
      // Validate that roles exist
      const roles = await Role.find({ _id: { $in: userData.roleIds } });
      if (roles.length !== userData.roleIds.length) {
        throw new Error('One or more roles not found');
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Create user
      const user = new User(userData);
      await user.save();

      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;

      return userResponse;
    } catch (error) {
      throw error;
    }
  }

  // Get all users with pagination and filters
  async getUsers(query, currentUser) {
    try {
      const { page, limit, skip, sort } = getPaginationOptions(query);
      
      // Build filter object
      const filter = {};
      
      if (query.type) filter.type = query.type;
      if (query.status) filter.status = query.status;
      if (query.roleId) filter.roleIds = query.roleId;
      
      // Search functionality
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } }
        ];
      }

      // Non-admin users can only see active users
      if (currentUser.type !== 'admin') {
        filter.status = 'active';
      }

      // Execute query
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken')
          .populate('roleIds', 'name permissions')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      // Create pagination response
      const response = createPaginationResponse(users, total, page, limit);
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId, currentUser) {
    try {
      const user = await User.findById(userId)
        .select('-password -refreshToken')
        .populate('roleIds', 'name permissions description');

      if (!user) {
        throw new Error('User not found');
      }

      // Check access permissions
      if (currentUser.type !== 'admin' && currentUser._id.toString() !== userId) {
        // Employees can only read basic user info
        const basicUserInfo = {
          _id: user._id,
          name: user.name,
          email: user.email,
          type: user.type,
          status: user.status,
          createdAt: user.createdAt
        };
        return basicUserInfo;
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updateData, currentUser) {
    try {
      // Check if user exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Only admins can update users
      if (currentUser.type !== 'admin') {
        throw new Error('Insufficient permissions');
      }

      // Validate roles if being updated
      if (updateData.roleIds) {
        const roles = await Role.find({ _id: { $in: updateData.roleIds } });
        if (roles.length !== updateData.roleIds.length) {
          throw new Error('One or more roles not found');
        }
      }

      // Check email uniqueness if being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await User.findOne({ email: updateData.email });
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshToken')
       .populate('roleIds', 'name permissions');

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId, currentUser) {
    try {
      // Check if user exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Only admins can delete users
      if (currentUser.type !== 'admin') {
        throw new Error('Insufficient permissions');
      }

      // Prevent admin from deleting themselves
      if (currentUser._id.toString() === userId) {
        throw new Error('Cannot delete your own account');
      }

      // Delete user
      await User.findByIdAndDelete(userId);

      return { message: 'User deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(roleName) {
    try {
      const role = await Role.findOne({ name: roleName.toUpperCase() });
      if (!role) {
        throw new Error('Role not found');
      }

      const users = await User.find({ roleIds: role._id })
        .select('-password -refreshToken')
        .populate('roleIds', 'name');

      return users;
    } catch (error) {
      throw error;
    }
  }

  // Update user status
  async updateUserStatus(userId, status, currentUser) {
    try {
      // Only admins can update user status
      if (currentUser.type !== 'admin') {
        throw new Error('Insufficient permissions');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { status },
        { new: true, runValidators: true }
      ).select('-password -refreshToken');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(currentUser) {
    try {
      // Only admins can see statistics
      if (currentUser.type !== 'admin') {
        throw new Error('Insufficient permissions');
      }

      const stats = await User.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            }
          }
        }
      ]);

      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: 'active' });

      return {
        totalUsers,
        activeUsers,
        byType: stats,
        inactiveUsers: totalUsers - activeUsers
      };
    } catch (error) {
      throw error;
    }
  }

  // Create customer
  async createCustomer(userData) {
    try {
      // Check if email already exists
      const existingCustomer = await User.findOne({ $or: [{ email: userData.email }, { phone: userData.phone }] });
      if (existingCustomer) {
        throw createError.conflict('customer already exists');
      }

      // Auto-assign customer type and status
      const customerData = {
        ...userData,
        type: 'customer',
        status: 'active'
      };

      // Ensure no password is set for customers
      delete customerData.password;

      // Create customer
      const customer = await User.create(customerData);
      
      // Return customer without sensitive fields
      const customerResponse = customer.toObject();
      delete customerResponse.password;
      delete customerResponse.refreshToken;

      return customerResponse;
    } catch (error) {
      // Re-throw ApiError instances as-is
      if (error.statusCode) {
        throw error;
      }
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        if (error.keyPattern.email || error.keyPattern.phone) {
          throw createError.conflict('customer already exists');
        }
        throw createError.conflict('Duplicate field value');
      }
      
      // Re-throw other errors
      throw error;
    }
  }
  async getCustomers(options = {}) {
    try {
      const { page = 1, limit = 10, search, status } = options;
      
      // Build query
      const query = { type: 'customer' };
      
      // Add status filter if provided
      if (status) {
        query.status = status;
      } else {
        // Default to active customers if no status specified
        query.status = 'active';
      }
      
      // Add search filter if provided
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Get total count for pagination
      const totalCustomers = await User.countDocuments(query);
      
      // Get customers with pagination
      const customers = await User.find(query)
        .select('-password -refreshToken -roleIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalCustomers / limit);
      
      return {
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCustomers,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }
  async getCustomerById(customerId) {
    const customer = await User.findOne({_id:customerId,type:'customer'});
    if (!customer) {
      return null;
    }
    // Remove sensitive data
    delete customer.password;
    delete customer.refreshToken;
    
    // Get quotation data for this customer
    const quotations = await Quotation.find({ 'customer.userId': customerId })
      .select('quotationId quotationNumber status currency validTill createdAt')
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .lean();
    
    // Calculate quotation statistics
    const quotationStats = {
      total: quotations.length,
      byStatus: quotations.reduce((acc, quote) => {
        acc[quote.status] = (acc[quote.status] || 0) + 1;
        return acc;
      }, {})
    };
    
    // Add quotation data to customer response
    customer.quotations = {
      data: quotations,
      statistics: quotationStats
    };
    
    return customer;
  }

  // Create supplier
  async createSupplier(userData) {
    try {
      // Check if email already exists
      const existingSupplier = await User.findOne({ $or: [{ email: userData.email }, { phone: userData.phone }] });
      if (existingSupplier) {
        throw createError.conflict('Supplier with this email or phone already exists');
      }

      // Auto-assign supplier type and status
      const supplierData = {
        ...userData,
        type: 'supplier',
        status: 'active'
      };

      // Ensure no password is set for suppliers
      delete supplierData.password;

      // Create supplier
      const supplier = await User.create(supplierData);
      
      // Return supplier without sensitive fields
      const supplierResponse = supplier.toObject();
      delete supplierResponse.password;
      delete supplierResponse.refreshToken;

      return supplierResponse;
    } catch (error) {
      // Re-throw ApiError instances as-is
      if (error.statusCode) {
        throw error;
      }
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        if (error.keyPattern.email) {
          throw createError.conflict('Email already exists');
        }
        if (error.keyPattern.phone) {
          throw createError.conflict('Phone number already exists');
        }
        if (error.keyPattern.custId) {
          throw createError.conflict('Supplier ID already exists');
        }
        throw createError.conflict('Duplicate field value');
      }
      
      // Handle role-related errors
      if (error.message && error.message.includes('role not found')) {
        throw createError.internal('System error: Required role not found. Please contact administrator.');
      }
      
      // Re-throw other errors as internal server error
      throw createError.internal('Failed to create supplier');
    }
  }

  // Get suppliers with pagination and filters
  async getSuppliers(options = {}) {
    try {
      const { page = 1, limit = 10, search, status } = options;
      
      // Build query
      const query = { type: 'supplier' };
      
      // Add status filter if provided
      if (status) {
        query.status = status;
      } else {
        // Default to active suppliers if no status specified
        query.status = 'active';
      }
      
      // Add search filter if provided
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Get total count for pagination
      const totalSuppliers = await User.countDocuments(query);
      
      // Get suppliers with pagination
      const suppliers = await User.find(query)
        .select('-password -refreshToken -roleIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalSuppliers / limit);
      
      return {
        suppliers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalSuppliers,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getSuppliers:', error);
      throw createError.internal('Failed to retrieve suppliers');
    }
  }

  // Get supplier by ID
  async getSupplierById(supplierId) {
    try {
      const supplier = await User.findOne({_id: supplierId, type: 'supplier'});
      if (!supplier) {
        return null;
      }
      // Remove sensitive data
      delete supplier.password;
      delete supplier.refreshToken;
      
      return supplier;
    } catch (error) {
      console.error('Error in getSupplierById:', error);
      throw createError.internal('Failed to retrieve supplier');
    }
  }

  // Update supplier
  async updateSupplier(supplierId, updateData, currentUser) {
    try {
      // Check if supplier exists
      const existingSupplier = await User.findOne({ _id: supplierId, type: 'supplier' });
      if (!existingSupplier) {
        throw createError.notFound('Supplier not found');
      }

      // Only admins can update suppliers
      if (currentUser.type !== 'admin') {
        throw createError.forbidden('Insufficient permissions to update supplier');
      }

      // Check email uniqueness if being updated
      if (updateData.email && updateData.email !== existingSupplier.email) {
        const emailExists = await User.findOne({ email: updateData.email });
        if (emailExists) {
          throw createError.conflict('Email already exists');
        }
      }

      // Update supplier
      const updatedSupplier = await User.findByIdAndUpdate(
        supplierId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshToken');

      return updatedSupplier;
    } catch (error) {
      // Re-throw ApiError instances as-is
      if (error.statusCode) {
        throw error;
      }
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw createError.badRequest(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        if (error.keyPattern.email) {
          throw createError.conflict('Email already exists');
        }
        throw createError.conflict('Duplicate field value');
      }
      
      console.error('Error in updateSupplier:', error);
      throw createError.internal('Failed to update supplier');
    }
  }

  // Delete supplier
  async deleteSupplier(supplierId, currentUser) {
    try {
      // Check if supplier exists
      const existingSupplier = await User.findOne({ _id: supplierId, type: 'supplier' });
      if (!existingSupplier) {
        throw createError.notFound('Supplier not found');
      }

      // Only admins can delete suppliers
      if (currentUser.type !== 'admin') {
        throw createError.forbidden('Insufficient permissions to delete supplier');
      }

      // Delete supplier
      await User.findByIdAndDelete(supplierId);

      return { message: 'Supplier deleted successfully' };
    } catch (error) {
      // Re-throw ApiError instances as-is
      if (error.statusCode) {
        throw error;
      }
      
      console.error('Error in deleteSupplier:', error);
      throw createError.internal('Failed to delete supplier');
    }
  }

  /**
   * Delete customer by ID (only if no active quotations exist)
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCustomer(customerId) {
    try {
      if (!customerId) {
        throw createError.badRequest('Customer ID is required');
      }

      // First, find the customer to verify they exist and are a customer
      const customer = await User.findById(customerId);
      
      if (!customer) {
        throw createError.notFound('Customer not found');
      }

      if (customer.type !== 'customer') {
        throw createError.badRequest('User is not a customer');
      }

      // Check if customer has any quotations with status not equal to 'rejected'
      const activeQuotations = await Quotation.find({
        'customer.userId': customerId,
        status: { $ne: 'rejected' }
      }).select('quotationId quotationNumber status');

      if (activeQuotations.length > 0) {
        const quotationDetails = activeQuotations.map(q => ({
          quotationId: q.quotationId,
          quotationNumber: q.quotationNumber,
          status: q.status
        }));

        return {
          success: false,
          message: `Cannot delete customer. Customer has ${activeQuotations.length} active quotation(s) that must be rejected first.`,
          data: {
            activeQuotations: quotationDetails
          }
        };
      }

      // Delete the customer
      await User.findByIdAndDelete(customerId);

      return {
        message: 'Customer deleted successfully',
        customerId: customer.custId,
        customerName: customer.name,
        deletedAt: new Date()
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw createError.badRequest('Invalid customer ID format');
      }
      throw error;
    }
  }
}

module.exports = new UserService();
