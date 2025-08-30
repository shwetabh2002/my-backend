const User = require('../models/User');
const Role = require('../models/Role');

// Check if user has specific permission
const hasPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await req.user.hasPermission(requiredPermission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

// Check if user has specific role
const hasRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasRole = await req.user.hasRole(requiredRole);
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient role access'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Check if user is employee or admin
const isEmployeeOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!['employee', 'admin'].includes(req.user.type)) {
      return res.status(403).json({
        success: false,
        message: 'Employee or admin access required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Check if user can access/modify specific resource
const canAccessResource = (resourceType, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const permission = `${resourceType}:${action}`;
      const hasPermission = await req.user.hasPermission(permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions for ${action} on ${resourceType}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

// Check if user can access their own resource or has admin access
const canAccessOwnResource = (resourceType, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const resourceId = req.params.id;
      
      // Admin can access all resources
      if (req.user.type === 'admin') {
        return next();
      }

      // Check if user is trying to access their own resource
      if (req.user._id.toString() === resourceId) {
        const permission = `${resourceType}:${action}`;
        const hasPermission = await req.user.hasPermission(permission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Insufficient permissions for ${action} on ${resourceType}`
          });
        }
        
        return next();
      }

      // User is trying to access someone else's resource
      return res.status(403).json({
        success: false,
        message: 'Can only access your own resources'
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

module.exports = {
  hasPermission,
  hasRole,
  isAdmin,
  isEmployeeOrAdmin,
  canAccessResource,
  canAccessOwnResource
};
