const Joi = require('joi');

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }
    
    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// Validation schemas
const schemas = {
  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  }),

  // User schemas
  createUser: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(15).messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 15 characters'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
    type: Joi.string().valid('employee', 'admin', 'customer').required().messages({
      'any.only': 'User type must be employee, admin, or customer',
      'any.required': 'User type is required'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
    roleIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required().messages({
      'array.min': 'At least one role is required',
      'any.required': 'Roles are required'
    })
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),
    email: Joi.string().email().messages({
      'string.email': 'Please provide a valid email address'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(15).messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 15 characters'
    }),
    type: Joi.string().valid('employee', 'admin', 'customer').messages({
      'any.only': 'User type must be employee, admin, or customer'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended'),
    roleIds: Joi.array().items(Joi.string().hex().length(24)).min(1).messages({
      'array.min': 'At least one role is required'
    })
  }).min(1), // At least one field must be provided

  // Customer creation schema (no password, auto-assigned type and role)
  createCustomer: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(15).required().messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 15 characters',
      'any.required': 'Phone is required'
    }),
    address: Joi.string().max(200).messages({
      'string.max': 'Address cannot exceed 200 characters'
    }),
    // Customer ID is auto-generated, but can be provided for specific cases
    custId: Joi.string().pattern(/^CUS-\d{3}$/).optional().messages({
      'string.pattern.base': 'Customer ID must be in format CUS-XXX'
    }),
    // Password is optional for customers (they can't login anyway)
    password: Joi.string().optional()
  }),

  // Role schemas
  createRole: Joi.object({
    name: Joi.string().valid('ADMIN', 'EMPLOYEE', 'CUSTOMER').required().messages({
      'any.only': 'Role name must be ADMIN, EMPLOYEE, or CUSTOMER',
      'any.required': 'Role name is required'
    }),
    permissions: Joi.array().items(Joi.string().valid(
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'role:create',
      'role:read',
      'role:update',
      'role:delete',
      'auth:login',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:delete'
    )).min(1).required().messages({
      'array.min': 'At least one permission is required',
      'any.required': 'Permissions are required'
    }),
    description: Joi.string().max(200).messages({
      'string.max': 'Description cannot exceed 200 characters'
    })
  }),

  updateRole: Joi.object({
    name: Joi.string().valid('ADMIN', 'EMPLOYEE', 'CUSTOMER').messages({
      'any.only': 'Role name must be ADMIN, EMPLOYEE, or CUSTOMER'
    }),
    permissions: Joi.array().items(Joi.string().valid(
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'role:create',
      'role:read',
      'role:update',
      'role:delete',
      'auth:login',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:delete'
    )).min(1).messages({
      'array.min': 'At least one permission is required'
    }),
    description: Joi.string().max(200).messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
    isActive: Joi.boolean()
  }).min(1), // At least one field must be provided

  // Query parameter schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('name', 'email', 'type', 'status', 'createdAt', '-name', '-email', '-type', '-status', '-createdAt').default('-createdAt')
  }),

  userFilters: Joi.object({
    type: Joi.string().valid('employee', 'admin', 'customer'),
    status: Joi.string().valid('active', 'inactive', 'suspended'),
    roleId: Joi.string().hex().length(24),
    search: Joi.string().min(1).max(100)
  }),

  // Inventory schemas
  createInventory: Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 200 characters',
      'any.required': 'Name is required'
    }),
    type: Joi.string().valid('car', 'part').required().messages({
      'any.only': 'Type must be car or part',
      'any.required': 'Type is required'
    }),
    category: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Category must be at least 2 characters long',
      'string.max': 'Category cannot exceed 100 characters',
      'any.required': 'Category is required'
    }),
    brand: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Brand must be at least 2 characters long',
      'string.max': 'Brand cannot exceed 100 characters',
      'any.required': 'Brand is required'
    }),
    model: Joi.string().min(1).max(100).optional().messages({
      'string.min': 'Model must be at least 1 character long',
      'string.max': 'Model cannot exceed 100 characters'
    }),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
      'number.integer': 'Year must be an integer',
      'number.min': 'Year must be at least 1900',
      'number.max': 'Year cannot be in the future'
    }),
    color: Joi.string().min(1).max(50).optional().messages({
      'string.min': 'Color must be at least 1 character long',
      'string.max': 'Color cannot exceed 50 characters'
    }),
    sku: Joi.string().min(3).max(50).optional().messages({
      'string.min': 'SKU must be at least 3 characters long',
      'string.max': 'SKU cannot exceed 50 characters'
    }),
    description: Joi.string().max(1000).optional().messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    costPrice: Joi.number().positive().required().messages({
      'number.positive': 'Cost price must be positive',
      'any.required': 'Cost price is required'
    }),
    sellingPrice: Joi.number().positive().required().messages({
      'number.positive': 'Selling price must be positive',
      'any.required': 'Selling price is required'
    }),
    quantity: Joi.number().integer().min(0).default(0).messages({
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity cannot be negative'
    }),
    location: Joi.string().max(100).optional().messages({
      'string.max': 'Location cannot exceed 100 characters'
    }),
    condition: Joi.string().valid('new', 'used', 'refurbished').default('new').messages({
      'any.only': 'Condition must be new, used, or refurbished'
    }),
    status: Joi.string().valid('active', 'inactive', 'discontinued').default('active').messages({
      'any.only': 'Status must be active, inactive, or discontinued'
    }),
    images: Joi.array().items(Joi.object({
      url: Joi.string().uri().required().messages({
        'string.uri': 'Image URL must be valid',
        'any.required': 'Image URL is required'
      }),
      alt: Joi.string().max(100).optional().messages({
        'string.max': 'Alt text cannot exceed 100 characters'
      }),
      caption: Joi.string().max(200).optional().messages({
        'string.max': 'Caption cannot exceed 200 characters'
      }),
      isPrimary: Joi.boolean().default(false).messages({
        'boolean.base': 'isPrimary must be a boolean'
      })
    })).optional().messages({
      'array.base': 'Images must be an array'
    }),
    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional(),
      weight: Joi.number().positive().optional()
    }).optional(),
    tags: Joi.array().items(Joi.string().min(1).max(50)).optional().messages({
      'array.base': 'Tags must be an array',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag cannot exceed 50 characters'
    })
  }),

  updateInventory: Joi.object({
    name: Joi.string().min(2).max(200).messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 200 characters'
    }),
    type: Joi.string().valid('car', 'part').messages({
      'any.only': 'Type must be car or part'
    }),
    category: Joi.string().min(2).max(100).messages({
      'string.min': 'Category must be at least 2 characters long',
      'string.max': 'Category cannot exceed 100 characters'
    }),
    brand: Joi.string().min(2).max(100).messages({
      'string.min': 'Brand must be at least 2 characters long',
      'string.max': 'Brand cannot exceed 100 characters'
    }),
    model: Joi.string().min(1).max(100).messages({
      'string.min': 'Model must be at least 1 character long',
      'string.max': 'Model cannot exceed 100 characters'
    }),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).messages({
      'number.integer': 'Year must be an integer',
      'number.min': 'Year must be at least 1900',
      'number.max': 'Year cannot be in the future'
    }),
    color: Joi.string().min(1).max(50).messages({
      'string.min': 'Color must be at least 1 character long',
      'string.max': 'Color cannot exceed 50 characters'
    }),
    sku: Joi.string().min(3).max(50).messages({
      'string.min': 'SKU must be at least 3 characters long',
      'string.max': 'SKU cannot exceed 50 characters'
    }),
    description: Joi.string().max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    costPrice: Joi.number().positive().messages({
      'number.positive': 'Cost price must be positive'
    }),
    sellingPrice: Joi.number().positive().messages({
      'number.positive': 'Selling price must be positive'
    }),
    quantity: Joi.number().integer().min(0).messages({
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity cannot be negative'
    }),
    location: Joi.string().max(100).messages({
      'string.max': 'Location cannot exceed 100 characters'
    }),
    condition: Joi.string().valid('new', 'used', 'refurbished').messages({
      'any.only': 'Condition must be new, used, or refurbished'
    }),
    status: Joi.string().valid('active', 'inactive', 'discontinued').messages({
      'any.only': 'Status must be active, inactive, or discontinued'
    }),
    images: Joi.array().items(Joi.object({
      url: Joi.string().uri().required().messages({
        'string.uri': 'Image URL must be valid',
        'any.required': 'Image URL is required'
      }),
      alt: Joi.string().max(100).optional().messages({
        'string.max': 'Alt text cannot exceed 100 characters'
      }),
      caption: Joi.string().max(200).optional().messages({
        'string.max': 'Caption cannot exceed 200 characters'
      }),
      isPrimary: Joi.boolean().default(false).messages({
        'boolean.base': 'isPrimary must be a boolean'
      })
    })).messages({
      'array.base': 'Images must be an array'
    }),
    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional(),
      weight: Joi.number().positive().optional()
    }).optional(),
    tags: Joi.array().items(Joi.string().min(1).max(50)).messages({
      'array.base': 'Tags must be an array',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag cannot exceed 50 characters'
    })
  }).min(1), // At least one field must be provided

  updateStock: Joi.object({
    quantity: Joi.number().integer().min(1).required().messages({
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required'
    }),
    operation: Joi.string().valid('add', 'subtract', 'set').default('add').messages({
      'any.only': 'Operation must be add, subtract, or set'
    })
  })
};

module.exports = {
  validate,
  schemas
};
