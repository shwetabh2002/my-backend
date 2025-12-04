const User = require('../models/User');
const Role = require('../models/Role');
const { generateTokenPair, verifyToken } = require('../utils/jwt');
const { createError } = require('../utils/apiError');
const crypto = require('crypto');



class AuthService {
  // Login user
  async login(email, password, companyId) {
    try {
      // Find user with password selected
      const user = await User.findOne({ email, companyId }).select('+password');
      
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

      // Validate companyId - user must belong to the specified company
      if (user.companyId && user.companyId !== companyId) {
        throw createError.forbidden('User does not belong to the specified company');
      }
      
      // If user doesn't have companyId set, set it now
      if (!user.companyId && companyId) {
        user.companyId = companyId;
        await user.save();
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw createError.unauthorized('Invalid email or password');
      }

      // Use the user's companyId (either existing or newly set)
      const userCompanyId = user.companyId || companyId;

      // Generate tokens with companyId
      const tokens = generateTokenPair(user._id, user.type, user.roleIds, userCompanyId);

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
  async refreshAccessToken(refreshToken, companyId) {
    try {
      // Verify refresh token to get decoded info (including companyId from token)
      let decoded;
      try {
        decoded = verifyToken(refreshToken);
      } catch (error) {
        throw createError.unauthorized('Invalid refresh token');
      }

      // Find user with refresh token
      const user = await User.findOne({ refreshToken, companyId }).select('+refreshToken');
      
      if (!user) {
        throw createError.unauthorized('Invalid refresh token');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw createError.forbidden('Account is not active');
      }

      // Validate companyId - check if it matches token's companyId and user's companyId
      const tokenCompanyId = decoded.companyId || null;
      
      if (companyId !== tokenCompanyId) {
        throw createError.forbidden('CompanyId mismatch - token companyId does not match provided companyId');
      }

      if (user.companyId && user.companyId !== companyId) {
        throw createError.forbidden('User does not belong to the specified company');
      }

      // Use the validated companyId
      const validatedCompanyId = companyId || user.companyId || null;

      // Generate new access token with companyId
      const tokens = generateTokenPair(user._id, user.type, user.roleIds, validatedCompanyId);

      // Update user's refresh token in database
      user.refreshToken = tokens.refreshToken;
      await user.save();

      // Get user roles with permissions
      const userRoles = await Role.find({ _id: { $in: user.roleIds } })
        .select('name permissions description');

      return { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
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
  async validateUserPermissions(userId, requiredPermissions, companyId) {
    try {
      const user = await User.findOne({_id: userId, companyId: companyId}).populate('roleIds', 'permissions');
      
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
  async getUserProfile(userId, companyId) {
    try {
      const user = await User.findOne({_id: userId, companyId: companyId})
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
  async getUserPermissions(userId, companyId) {
    try {
      const user = await User.findOne({_id: userId, companyId: companyId})
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
  async changePassword(userId, currentPassword, newPassword, companyId) {
    try {
      const user = await User.findOne({_id: userId, companyId: companyId}).select('+password');
      
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

  // Forgot password - Generate reset token
  async forgotPassword(email, companyId) {
    try {
      const user = await User.findOne({ email, companyId }).select('+resetPasswordToken +resetPasswordExpires');
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // Check if user type allows password reset
      if (user.type === 'customer' || user.type === 'supplier') {
        throw createError.forbidden('Password reset is not available for this user type');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Set token expiration (1 hour from now)
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

      // Save token to user
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save({ validateBeforeSave: false });

      // In production, you would send this token via email
      // For now, return the token (remove this in production)
      return {
        message: 'Password reset token generated successfully',
        resetToken: resetToken, // Remove this in production - send via email instead
        expiresAt: resetTokenExpires,
        note: 'In production, this token would be sent via email'
      };
    } catch (error) {
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(token, newPassword, companyId) {
    try {
      // Hash the token to compare with stored hash
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: { $gt: Date.now() },
        companyId: companyId
      }).select('+resetPasswordToken +resetPasswordExpires');

      if (!user) {
        throw createError.badRequest('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Admin reset password (admin can reset any user's password)
  async adminResetPassword(adminUserId, targetUserId, newPassword, companyId) {
    try {
      // Verify admin exists and is active
      const admin = await User.findOne({_id: adminUserId, companyId: companyId});
      if (!admin || admin.type !== 'admin' || admin.status !== 'active') {
        throw createError.forbidden('Only active admins can reset passwords');
      }

      // Find target user
      const targetUser = await User.findOne({_id: targetUserId, companyId: companyId});
      if (!targetUser) {
        throw createError.notFound('User not found');
      }

      // Check if user type allows password reset
      if (targetUser.type === 'customer' || targetUser.type === 'supplier') {
        throw createError.forbidden('Password reset is not available for this user type');
      }

      // Update password
      targetUser.password = newPassword;
      targetUser.resetPasswordToken = undefined;
      targetUser.resetPasswordExpires = undefined;
      await targetUser.save();

      return {
        message: 'Password reset successfully by admin',
        userId: targetUser._id,
        email: targetUser.email
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();
