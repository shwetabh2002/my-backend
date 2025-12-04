const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if user exists and is active
    const user = await User.findById(decoded.userId)
      .select('-password -refreshToken')
      .populate('roleIds', 'name permissions');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User account is not active'
      });
    }

    // Check if user type allows login
    if (user.type === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Customers cannot access this resource'
      });
    }

    // Validate companyId from token matches user's companyId
    const tokenCompanyId = decoded.companyId || null;
    if (user.companyId && tokenCompanyId && user.companyId !== tokenCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Company mismatch - token companyId does not match user companyId'
      });
    }

    // Attach user to request
    req.user = user;
    
    // Attach companyId to request (from token, user, or query)
    // Priority: query param > token > user.companyId
    req.companyId = req.query.companyId || tokenCompanyId || user.companyId || null;
    
    // Also set req.query.companyId if not provided, so existing code can use it
    if (!req.query.companyId && req.companyId) {
      req.query.companyId = req.companyId;
    }
    
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if user exists and refresh token matches
    const user = await User.findById(decoded.userId)
      .select('refreshToken type roleIds');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

module.exports = {
  authenticate,
  refreshToken
};
