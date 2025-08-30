const User = require('../models/User');
const Role = require('../models/Role');
const { generateTokenPair } = require('../utils/jwt');
const { createError } = require('../utils/apiError');



class AuthService {
  // Login user
  async login(email, password) {
    try {
      // Find user with password selected
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw createError.unauthorized('Invalid email or password');
      }

      // Check if user type allows login
      if (user.type === 'customer') {
        throw createError.forbidden('Customers cannot login');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw createError.forbidden('Account is not active');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw createError.unauthorized('Invalid email or password');
      }

      // Generate tokens
      const tokens = generateTokenPair(user._id, user.type, user.roleIds);

      // Update user's refresh token and last login
      user.refreshToken = tokens.refreshToken;
      user.lastLogin = new Date();
      await user.save();

      // Remove password and refresh token from response
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.refreshToken;

      // Get user roles with permissions
      const userRoles = await Role.find({ _id: { $in: user.roleIds } })
        .select('name permissions description');

      // Add roles to user response
      userResponse.roles = userRoles;

      return {
        user: userResponse,
        // roles: userRoles,
        permissions: userRoles.flatMap(role => role.permissions),
        ...tokens
      };
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      // Find user with refresh token
      const user = await User.findOne({ refreshToken }).select('+refreshToken');
      
      if (!user) {
        throw createError.unauthorized('Invalid refresh token');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw createError.forbidden('Account is not active');
      }

      // Generate new access token
      const accessToken = generateTokenPair(user._id, user.type, user.roleIds).accessToken;

      // Get user roles with permissions
      const userRoles = await Role.find({ _id: { $in: user.roleIds } })
        .select('name permissions description');

      return { 
        accessToken,
        roles: userRoles,
        permissions: userRoles.flatMap(role => role.permissions)
      };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $unset: { refreshToken: 1 }
      });

      return { message: 'Logged out successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Validate user permissions
  async validateUserPermissions(userId, requiredPermissions) {
    try {
      const user = await User.findById(userId).populate('roleIds', 'permissions');
      
      if (!user) {
        throw createError.notFound('User not found');
      }

      if (user.status !== 'active') {
        throw createError.forbidden('User account is not active');
      }

      // Check if user has any of the required permissions
      const userPermissions = user.roleIds.flatMap(role => role.permissions);
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      return {
        hasPermission,
        userPermissions,
        roles: user.roleIds
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -refreshToken')
        .populate('roleIds', 'name permissions description');

      if (!user) {
        throw createError.notFound('User not found');
      }

      // Get user roles with permissions
      const userRoles = await Role.find({ _id: { $in: user.roleIds } })
        .select('name permissions description');

      // Add roles to user response
      user.roles = userRoles;
      user.permissions = userRoles.flatMap(role => role.permissions);

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get user permissions summary
  async getUserPermissions(userId) {
    try {
      const user = await User.findById(userId)
        .select('roleIds type status')
        .populate('roleIds', 'name permissions description');

      if (!user) {
        throw createError.notFound('User not found');
      }

      if (user.status !== 'active') {
        throw createError.forbidden('User account is not active');
      }

      const permissions = user.roleIds.flatMap(role => role.permissions);
      const uniquePermissions = [...new Set(permissions)];

      return {
        userId: user._id,
        type: user.type,
        roles: user.roleIds,
        permissions: uniquePermissions,
        permissionCount: uniquePermissions.length
      };
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        throw createError.notFound('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw createError.unauthorized('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
