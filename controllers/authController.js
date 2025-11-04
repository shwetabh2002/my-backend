const authService = require('../services/authService');
const { asyncHandler } = require('../middlewares/errorHandler');

class AuthController {
  // Login user
  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Refresh access token
  refreshToken = async (req, res) => {
    try {
      // Get refresh token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required in Authorization header',
          statusCode: 401
        });
      }

      const refreshToken = authHeader.substring(7); // Remove 'Bearer ' prefix

      const result = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Logout user
  logout = async (req, res) => {
    try {
      const userId = req.user._id;

      const result = await authService.logout(userId);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get user profile
  getProfile = async (req, res) => {
    try {
      const userId = req.user._id;

      const user = await authService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Change password
  changePassword = async (req, res) => {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get user permissions
  getUserPermissions = async (req, res) => {
    try {
      const userId = req.user._id;

      const permissions = await authService.getUserPermissions(userId);

      res.status(200).json({
        success: true,
        message: 'User permissions retrieved successfully',
        data: permissions
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Validate token (for testing purposes)
  validateToken = async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Validate token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Forgot password - Request password reset
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      const result = await authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Reset password with token
  resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      const result = await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Admin reset password
  adminResetPassword = async (req, res) => {
    try {
      const adminUserId = req.user._id;
      const { userId, newPassword } = req.body;

      const result = await authService.adminResetPassword(adminUserId, userId, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      // Handle custom API errors with status codes
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      // Handle unexpected errors
      console.error('Admin reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };
}

module.exports = new AuthController();
