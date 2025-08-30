const User = require('../models/User');
const Role = require('../models/Role');
const { getPaginationOptions, createPaginationResponse } = require('../utils/pagination');
const { createError } = require('../utils/apiError');

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
}

module.exports = new UserService();
