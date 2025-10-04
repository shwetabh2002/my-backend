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
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
      'string.pattern.base': 'Country code must start with + followed by 1-3 digits (e.g., +1, +971, +44)',
      'any.required': 'Country code is required'
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
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).optional().messages({
      'string.pattern.base': 'Country code must start with + followed by 1-3 digits (e.g., +1, +971, +44)',
      'any.required': 'Country code is required'
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
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
      'string.pattern.base': 'Country code must start with + followed by 1-3 digits (e.g., +1, +971, +44)',
      'any.required': 'Country code is required'
    }),
    address: Joi.string().max(200).messages({
      'string.max': 'Address cannot exceed 200 characters'
    }),
    trn: Joi.string().max(50).optional().messages({
      'string.max': 'TRN number cannot exceed 50 characters'
    }),
    // Customer ID is auto-generated, but can be provided for specific cases
    custId: Joi.string().pattern(/^CUS-\d{3}$/).optional().messages({
      'string.pattern.base': 'Customer ID must be in format CUS-XXX'
    }),
    // Password is optional for customers (they can't login anyway)
    password: Joi.string().optional()
  }),

  // Supplier creation schema (no password, auto-assigned type and role)
  createSupplier: Joi.object({
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
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
      'string.pattern.base': 'Country code must start with + followed by 1-3 digits (e.g., +1, +971, +44)',
      'any.required': 'Country code is required'
    }),
    address: Joi.string().max(200).messages({
      'string.max': 'Address cannot exceed 200 characters'
    }) 
  }),

  // Supplier update schema
  updateSupplier: Joi.object({
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
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).messages({
      'string.pattern.base': 'Country code must start with + followed by 1-3 digits (e.g., +1, +971, +44)'
    }),
    address: Joi.string().max(200).messages({
      'string.max': 'Address cannot exceed 200 characters'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended').messages({
      'any.only': 'Status must be active, inactive, or suspended'
    })
  }).min(1), // At least one field must be provided

  // Role schemas
  createRole: Joi.object({
    name: Joi.string().valid('ADMIN', 'EMPLOYEE', 'CUSTOMER', 'SUPPLIER').required().messages({
      'any.only': 'Role name must be ADMIN, EMPLOYEE, CUSTOMER, or SUPPLIER',
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
      'inventory:delete',
      'company:create',
      'company:read',
      'company:update',
      'company:delete',
      'quotation:create',
      'quotation:read',
      'quotation:update',
      'quotation:delete'
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
      'inventory:delete',
      'company:create',
      'company:read',
      'company:update',
      'company:delete',
      'quotation:create',
      'quotation:read',
      'quotation:update',
      'quotation:delete'
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
    subcategory: Joi.string().min(1).max(100).optional().messages({
      'string.min': 'Subcategory must be at least 1 character long',
      'string.max': 'Subcategory cannot exceed 100 characters'
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
    interiorColor: Joi.string().min(1).max(50).optional().messages({
      'string.min': 'Interior color must be at least 1 character long',
      'string.max': 'Interior color cannot exceed 50 characters'
    }),
    description: Joi.string().max(1000).optional().messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    compatibility: Joi.array().items(Joi.object({
      brand: Joi.string().min(1).max(100).optional(),
      model: Joi.string().min(1).max(100).optional(),
      yearFrom: Joi.number().integer().min(1900).optional(),
      yearTo: Joi.number().integer().min(1900).optional(),
      notes: Joi.string().max(200).optional()
    })).optional().messages({
      'array.base': 'Compatibility must be an array'
    }),
    costPrice: Joi.number().positive().required().messages({
      'number.positive': 'Cost price must be positive',
      'any.required': 'Cost price is required'
    }),
    supplierId: Joi.string().hex().length(24).optional().messages({
      'string.hex': 'Supplier ID must be a valid ObjectId',
      'string.length': 'Supplier ID must be 24 characters long'
    }),
    sellingPrice: Joi.number().positive().required().messages({
      'number.positive': 'Selling price must be positive',
      'any.required': 'Selling price is required'
    }),
    quantity: Joi.number().integer().min(0).default(0).messages({
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity cannot be negative'
    }),
    inStock: Joi.boolean().default(true).messages({
      'boolean.base': 'inStock must be a boolean'
    }),
    condition: Joi.string().valid('new', 'used', 'refurbished', 'damaged').default('new').messages({
      'any.only': 'Condition must be new, used, refurbished, or damaged'
    }),
    status: Joi.string().valid('active', 'inactive', 'discontinued', 'out_of_stock', 'sold', 'hold').default('active').messages({
      'any.only': 'Status must be active, inactive, discontinued, out_of_stock, sold, or hold'
    }),
    vinNumber: Joi.array().items(Joi.object({
      status: Joi.string().valid('active', 'inactive', 'hold', 'sold').default('active').messages({
        'any.only': 'VIN status must be active, inactive, hold, or sold'
      }),
      chasisNumber: Joi.string().min(1).max(50).required().messages({
        'string.min': 'Chassis number must be at least 1 character long',
        'string.max': 'Chassis number cannot exceed 50 characters',
        'any.required': 'Chassis number is required'
      })
    })).optional().messages({
      'array.base': 'VIN numbers must be an array'
    }),
    dimensions: Joi.object({
      length: Joi.number().optional(),
      width: Joi.number().optional(),
      height: Joi.number().optional(),
      weight: Joi.number().optional()
    }).optional()
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
    supplierId: Joi.string().hex().length(24).optional().messages({
      'string.hex': 'Supplier ID must be a valid ObjectId',
      'string.length': 'Supplier ID must be 24 characters long'
    }),
    subcategory: Joi.string().min(1).max(100).messages({
      'string.min': 'Subcategory must be at least 1 character long',
      'string.max': 'Subcategory cannot exceed 100 characters'
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
    interiorColor: Joi.string().min(1).max(50).messages({
      'string.min': 'Interior color must be at least 1 character long',
      'string.max': 'Interior color cannot exceed 50 characters'
    }),
    description: Joi.string().max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    compatibility: Joi.array().items(Joi.object({
      brand: Joi.string().min(1).max(100).optional(),
      model: Joi.string().min(1).max(100).optional(),
      yearFrom: Joi.number().integer().min(1900).optional(),
      yearTo: Joi.number().integer().min(1900).optional(),
      notes: Joi.string().max(200).optional()
    })).optional().messages({
      'array.base': 'Compatibility must be an array'
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
    inStock: Joi.boolean().messages({
      'boolean.base': 'inStock must be a boolean'
    }),
    condition: Joi.string().valid('new', 'used', 'refurbished', 'damaged').messages({
      'any.only': 'Condition must be new, used, refurbished, or damaged'
    }),
    status: Joi.string().valid('active', 'inactive', 'discontinued', 'out_of_stock', 'sold', 'hold').messages({
      'any.only': 'Status must be active, inactive, discontinued, out_of_stock, sold, or hold'
    }),
    vinNumber: Joi.array().items(Joi.object({
      status: Joi.string().messages({
        'any.only': 'Only active VIN numbers can be edited'
      }),
      chasisNumber: Joi.string().min(1).max(50).required().messages({
        'string.min': 'Chassis number must be at least 1 character long',
        'string.max': 'Chassis number cannot exceed 50 characters',
        'any.required': 'Chassis number is required'
      })
    })).optional().messages({
      'array.base': 'VIN numbers must be an array'
    }),
    dimensions: Joi.object({
      length: Joi.number().optional(),
      width: Joi.number().optional(),
      height: Joi.number().optional(),
      weight: Joi.number().optional()
    }).optional()
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
  }),

  // Company schemas
  createCompany: Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 200 characters',
      'any.required': 'Company name is required'
    }),
    legalName: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Legal name must be at least 2 characters long',
      'string.max': 'Legal name cannot exceed 200 characters',
      'any.required': 'Legal name is required'
    }),
    industry: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Industry must be at least 2 characters long',
      'string.max': 'Industry cannot exceed 100 characters',
      'any.required': 'Industry is required'
    }),
    businessType: Joi.string().valid('Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other').default('Corporation').messages({
      'any.only': 'Business type must be one of: Corporation, LLC, Partnership, Sole Proprietorship, Non-Profit, Government, Other'
    }),
    description: Joi.string().max(1000).optional().messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    taxId: Joi.string().max(50).optional().messages({
      'string.max': 'Tax ID cannot exceed 50 characters'
    }),
    registrationNumber: Joi.string().max(50).optional().messages({
      'string.max': 'Registration number cannot exceed 50 characters'
    }),
    incorporationDate: Joi.date().max('now').optional().messages({
      'date.max': 'Incorporation date cannot be in the future'
    }),
    website: Joi.string().uri().optional().messages({
      'string.uri': 'Website must be a valid URL'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).required().messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 20 characters',
      'any.required': 'Phone is required'
    }),
    fax: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).optional().messages({
      'string.pattern.base': 'Please provide a valid fax number',
      'string.min': 'Fax number must be at least 10 characters',
      'string.max': 'Fax number cannot exceed 20 characters'
    }),
    address: Joi.object({
      street: Joi.string().min(5).max(200).required().messages({
        'string.min': 'Street address must be at least 5 characters long',
        'string.max': 'Street address cannot exceed 200 characters',
        'any.required': 'Street address is required'
      }),
      city: Joi.string().min(2).max(100).required().messages({
        'string.min': 'City must be at least 2 characters long',
        'string.max': 'City cannot exceed 100 characters',
        'any.required': 'City is required'
      }),
      state: Joi.string().min(2).max(100).required().messages({
        'string.min': 'State must be at least 2 characters long',
        'string.max': 'State cannot exceed 100 characters',
        'any.required': 'State is required'
      }),
      postalCode: Joi.string().min(3).max(20).required().messages({
        'string.min': 'Postal code must be at least 3 characters long',
        'string.max': 'Postal code cannot exceed 20 characters',
        'any.required': 'Postal code is required'
      }),
      country: Joi.string().min(2).max(100).default('United States').messages({
        'string.min': 'Country must be at least 2 characters long',
        'string.max': 'Country cannot exceed 100 characters'
      })
    }).required().messages({
      'any.required': 'Address is required'
    }),
    billingAddress: Joi.object({
      street: Joi.string().min(5).max(200).required(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).default('United States')
    }).optional(),
    shippingAddress: Joi.object({
      street: Joi.string().min(5).max(200).required(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).default('United States')
    }).optional(),
    contacts: Joi.array().items(Joi.object({
      name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Contact name must be at least 2 characters long',
        'string.max': 'Contact name cannot exceed 100 characters',
        'any.required': 'Contact name is required'
      }),
      email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Contact email is required'
      }),
      phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).required().messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'string.min': 'Phone number must be at least 10 characters',
        'string.max': 'Phone number cannot exceed 20 characters',
        'any.required': 'Contact phone is required'
      }),
      position: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Position must be at least 2 characters long',
        'string.max': 'Position cannot exceed 100 characters',
        'any.required': 'Position is required'
      }),
      isPrimary: Joi.boolean().default(false)
    })).optional().messages({
      'array.base': 'Contacts must be an array'
    }),
    annualRevenue: Joi.number().min(0).optional().messages({
      'number.min': 'Annual revenue cannot be negative'
    }),
    currency: Joi.string().length(3).uppercase().default('USD').messages({
      'string.length': 'Currency must be exactly 3 characters',
      'string.uppercase': 'Currency must be uppercase'
    }),
    creditLimit: Joi.number().min(0).default(0).messages({
      'number.min': 'Credit limit cannot be negative'
    }),
    paymentTerms: Joi.string().valid('Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'Prepaid', 'Other').default('Net 30').messages({
      'any.only': 'Payment terms must be one of: Net 15, Net 30, Net 45, Net 60, Due on Receipt, Prepaid, Other'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending', 'archived').default('active').messages({
      'any.only': 'Status must be one of: active, inactive, suspended, pending, archived'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium').messages({
      'any.only': 'Priority must be one of: low, medium, high, critical'
    }),
    customerTier: Joi.string().valid('bronze', 'silver', 'gold', 'platinum', 'enterprise').default('bronze').messages({
      'any.only': 'Customer tier must be one of: bronze, silver, gold, platinum, enterprise'
    }),
    socialMedia: Joi.object({
      linkedin: Joi.string().uri().optional().messages({
        'string.uri': 'LinkedIn URL must be valid'
      }),
      twitter: Joi.string().uri().optional().messages({
        'string.uri': 'Twitter URL must be valid'
      }),
      facebook: Joi.string().uri().optional().messages({
        'string.uri': 'Facebook URL must be valid'
      })
    }).optional(),
    tags: Joi.array().items(Joi.string().min(1).max(50)).optional().messages({
      'array.base': 'Tags must be an array',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag cannot exceed 50 characters'
    }),
    categories: Joi.array().items(Joi.string().min(1).max(100)).optional().messages({
      'array.base': 'Categories must be an array',
      'string.min': 'Category must be at least 1 character long',
      'string.max': 'Category cannot exceed 100 characters'
    }),
    notes: Joi.string().max(2000).optional().messages({
      'string.max': 'Notes cannot exceed 2000 characters'
    }),
    internalNotes: Joi.string().max(2000).optional().messages({
      'string.max': 'Internal notes cannot exceed 2000 characters'
    })
  }),

  updateCompany: Joi.object({
    name: Joi.string().min(2).max(200).messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 200 characters'
    }),
    legalName: Joi.string().min(2).max(200).messages({
      'string.min': 'Legal name must be at least 2 characters long',
      'string.max': 'Legal name cannot exceed 200 characters'
    }),
    industry: Joi.string().min(2).max(100).messages({
      'string.min': 'Industry must be at least 2 characters long',
      'string.max': 'Industry cannot exceed 100 characters'
    }),
    businessType: Joi.string().valid('Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other').messages({
      'any.only': 'Business type must be one of: Corporation, LLC, Partnership, Sole Proprietorship, Non-Profit, Government, Other'
    }),
    description: Joi.string().max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    taxId: Joi.string().max(50).messages({
      'string.max': 'Tax ID cannot exceed 50 characters'
    }),
    registrationNumber: Joi.string().max(50).messages({
      'string.max': 'Registration number cannot exceed 50 characters'
    }),
    incorporationDate: Joi.date().max('now').messages({
      'date.max': 'Incorporation date cannot be in the future'
    }),
    website: Joi.string().uri().messages({
      'string.uri': 'Website must be a valid URL'
    }),
    email: Joi.string().email().messages({
      'string.email': 'Please provide a valid email address'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
    fax: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).messages({
      'string.pattern.base': 'Please provide a valid fax number',
      'string.min': 'Fax number must be at least 10 characters',
      'string.max': 'Fax number cannot exceed 20 characters'
    }),
    address: Joi.object({
      street: Joi.string().min(5).max(200).required(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).default('United States')
    }).optional(),
    billingAddress: Joi.object({
      street: Joi.string().min(5).max(200).required(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).default('United States')
    }).optional(),
    shippingAddress: Joi.object({
      street: Joi.string().min(5).max(200).required(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).default('United States')
    }).optional(),
    annualRevenue: Joi.number().min(0).messages({
      'number.min': 'Annual revenue cannot be negative'
    }),
    currency: Joi.string().length(3).uppercase().messages({
      'string.length': 'Currency must be exactly 3 characters',
      'string.uppercase': 'Currency must be uppercase'
    }),
    creditLimit: Joi.number().min(0).messages({
      'number.min': 'Credit limit cannot be negative'
    }),
    paymentTerms: Joi.string().valid('Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'Prepaid', 'Other').messages({
      'any.only': 'Payment terms must be one of: Net 15, Net 30, Net 45, Net 60, Due on Receipt, Prepaid, Other'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending', 'archived').messages({
      'any.only': 'Status must be one of: active, inactive, suspended, pending, archived'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').messages({
      'any.only': 'Priority must be one of: low, medium, high, critical'
    }),
    customerTier: Joi.string().valid('bronze', 'silver', 'gold', 'platinum', 'enterprise').messages({
      'any.only': 'Customer tier must be one of: bronze, silver, gold, platinum, enterprise'
    }),
    socialMedia: Joi.object({
      linkedin: Joi.string().uri().optional(),
      twitter: Joi.string().uri().optional(),
      facebook: Joi.string().uri().optional()
    }).optional(),
    tags: Joi.array().items(Joi.string().min(1).max(50)).messages({
      'array.base': 'Tags must be an array',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag cannot exceed 50 characters'
    }),
    categories: Joi.array().items(Joi.string().min(1).max(100)).messages({
      'array.base': 'Categories must be an array',
      'string.min': 'Category must be at least 1 character long',
      'string.max': 'Category cannot exceed 100 characters'
    }),
    notes: Joi.string().max(2000).messages({
      'string.max': 'Notes cannot exceed 2000 characters'
    }),
    internalNotes: Joi.string().max(2000).messages({
      'string.max': 'Internal notes cannot exceed 2000 characters'
    })
  }).min(1), // At least one field must be provided

  updateCompanyStatus: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending', 'archived').required().messages({
      'any.only': 'Status must be one of: active, inactive, suspended, pending, archived',
      'any.required': 'Status is required'
    })
  }),

  addContact: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Contact name must be at least 2 characters long',
      'string.max': 'Contact name cannot exceed 100 characters',
      'any.required': 'Contact name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Contact email is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).required().messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 20 characters',
      'any.required': 'Contact phone is required'
    }),
    position: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Position must be at least 2 characters long',
      'string.max': 'Position cannot exceed 100 characters',
      'any.required': 'Position is required'
    }),
    isPrimary: Joi.boolean().default(false)
  }),

  updateContact: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.min': 'Contact name must be at least 2 characters long',
      'string.max': 'Contact name cannot exceed 100 characters'
    }),
    email: Joi.string().email().messages({
      'string.email': 'Please provide a valid email address'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).min(10).max(20).messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.min': 'Phone number must be at least 10 characters',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
    position: Joi.string().min(2).max(100).messages({
      'string.min': 'Position must be at least 2 characters long',
      'string.max': 'Position cannot exceed 100 characters'
    }),
    isPrimary: Joi.boolean()
  }).min(1), // At least one field must be provided

  bulkUpdateCompanies: Joi.object({
    companyIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required().messages({
      'array.min': 'At least one company ID is required',
      'any.required': 'Company IDs are required'
    }),
    updateData: Joi.object().min(1).required().messages({
      'object.min': 'At least one field must be provided for update',
      'any.required': 'Update data is required'
    })
  }),

  companyFilters: Joi.object({
    search: Joi.string().min(1).max(100).messages({
      'string.min': 'Search term must be at least 1 character long',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending', 'archived'),
    industry: Joi.string().min(1).max(100).messages({
      'string.min': 'Industry must be at least 1 character long',
      'string.max': 'Industry cannot exceed 100 characters'
    }),
    businessType: Joi.string().valid('Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other'),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    customerTier: Joi.string().valid('bronze', 'silver', 'gold', 'platinum', 'enterprise'),
    createdBy: Joi.string().hex().length(24),
    dateFrom: Joi.date().max('now'),
    dateTo: Joi.date().max('now')
  }),

  // Quotation schemas
  createQuotation: Joi.object({
    custId: Joi.string().required().messages({
      'any.required': 'Customer ID is required'
    }),
    items: Joi.array().items(Joi.object({
      // Inventory fields (flat structure)
      itemId: Joi.string().hex().length(24).required().messages({
        'any.required': 'Item ID is required'
      }),
      supplierId: Joi.string().hex().length(24).optional().messages({
        'any.required': 'Supplier ID is required',
        'string.hex': 'Supplier ID must be a valid ObjectId',
        'string.length': 'Supplier ID must be 24 characters long'
      }),
      name: Joi.string().trim().max(200).required().messages({
        'string.max': 'Product name cannot exceed 200 characters',
        'any.required': 'Product name is required'
      }),
      type: Joi.string().valid('car', 'part').required().messages({
        'any.only': 'Product type must be car or part',
        'any.required': 'Product type is required'
      }),
      category: Joi.string().trim().max(100).required().messages({
        'string.max': 'Category cannot exceed 100 characters',
        'any.required': 'Category is required'
      }),
      brand: Joi.string().trim().max(100).required().messages({
        'string.max': 'Brand cannot exceed 100 characters',
        'any.required': 'Brand is required'
      }),
      model: Joi.string().trim().max(100).optional().messages({
        'string.max': 'Model cannot exceed 100 characters'
      }),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
        'number.integer': 'Year must be an integer',
        'number.min': 'Year must be at least 1900',
        'number.max': 'Year cannot be in the future'
      }),
      color: Joi.string().trim().max(50).optional().messages({
        'string.max': 'Color cannot exceed 50 characters'
      }),
      sku: Joi.string().trim().uppercase().required().messages({
        'any.required': 'SKU is required'
      }),
      description: Joi.string().trim().max(1000).optional().messages({
        'string.max': 'Description cannot exceed 1000 characters'
      }),
      specifications: Joi.object().pattern(Joi.string(), Joi.string()).optional().messages({
        'object.pattern': 'Specifications must be key-value pairs'
      }),
      sellingPrice: Joi.number().min(0).required().messages({
        'number.min': 'Selling price cannot be negative',
        'any.required': 'Selling price is required'
      }),
      condition: Joi.string().valid('new', 'used', 'refurbished', 'damaged').default('new').messages({
        'any.only': 'Condition must be new, used, refurbished, or damaged'
      }),
      status: Joi.string().valid('active', 'inactive', 'discontinued', 'out_of_stock').default('active').messages({
        'any.only': 'Status must be active, inactive, discontinued, or out_of_stock'
      }),
      dimensions: Joi.object({
        length: Joi.number().min(0).optional().messages({
          'number.min': 'Length cannot be negative'
        }),
        width: Joi.number().min(0).optional().messages({
          'number.min': 'Width cannot be negative'
        }),
        height: Joi.number().min(0).optional().messages({
          'number.min': 'Height cannot be negative'
        }),
        weight: Joi.number().min(0).optional().messages({
          'number.min': 'Weight cannot be negative'
        })
      }).optional(),
      tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
      
      // VIN and Interior Color fields
      vinNumbers: Joi.array().items(Joi.object({
        status: Joi.string().valid('active', 'inactive', 'hold', 'sold').default('active').messages({
          'any.only': 'VIN status must be active, inactive, hold, or sold'
        }),
        chasisNumber: Joi.string().trim().required().messages({
          'any.required': 'Chassis number is required for VIN'
        })
      })).optional(),
      interiorColor: Joi.string().trim().optional(),
      
      // Quotation-specific fields
      quantity: Joi.number().integer().min(1).required().messages({
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
      })
    })).min(1).required().messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required'
    }),
    discount: Joi.number().min(0).default(0).messages({
      'number.min': 'Total discount cannot be negative'
    }),
    discountType: Joi.string().valid('percentage', 'fixed').default('percentage').messages({
      'any.only': 'Discount type must be percentage or fixed'
    }),
    VAT: Joi.number().min(0).max(100).optional().messages({
      'number.min': 'VAT cannot be negative',
      'number.max': 'VAT cannot exceed 100'
    }),
    currency: Joi.string().length(3).uppercase().default('AED').messages({
      'string.length': 'Currency must be exactly 3 characters',
      'string.uppercase': 'Currency must be uppercase'
    }),
    notes: Joi.string().max(1000).optional().messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),
    paymentTerms: Joi.string().max(200).optional().messages({
      'string.max': 'Payment terms cannot exceed 200 characters'
    }),
    additionalExpenses: Joi.object({
      expenceType: Joi.string().valid('shipping', 'accessories', 'Rta Fees', 'COO Fees', 'Customs', 'Insurance', 'Other', 'none').required().messages({
        'any.only': 'Expense type must be one of: shipping, accessories, Rta Fees, COO Fees, Customs, Insurance, Other, none',
        'any.required': 'Expense type is required'
      }),
      description: Joi.string().trim().max(500).messages({
        'string.max': 'Description cannot exceed 500 characters',
        'any.required': 'Description is required'
      }),
      amount: Joi.number().min(0).messages({
        'number.min': 'Amount cannot be negative',
        'any.required': 'Amount is required'
      })
    }).optional(),
    exportTo: Joi.string().max(200).optional().messages({
      'string.max': 'Export destination cannot exceed 200 characters'
    })
  }),

  updateQuotation: Joi.object({
    customer: Joi.object({
      custId: Joi.string().messages({
        'string.hex': 'Customer ID must be a valid string'
      }),
      address: Joi.object({
        street: Joi.string().max(200).messages({
          'string.max': 'Street address cannot exceed 200 characters'
        }),
        city: Joi.string().max(100).messages({
          'string.max': 'City cannot exceed 100 characters'
        }),
        state: Joi.string().max(100).messages({
          'string.max': 'State cannot exceed 100 characters'
        }),
        postalCode: Joi.string().max(20).messages({
          'string.max': 'Postal code cannot exceed 20 characters'
        }),
        country: Joi.string().max(100).messages({
          'string.max': 'Country cannot exceed 100 characters'
        })
      }).optional()
    }).optional(),
    validTill: Joi.date().min('now').messages({
      'date.min': 'Valid till date cannot be in the past'
    }),
    status: Joi.string().valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted').messages({
      'any.only': 'Status must be one of: draft, sent, viewed, accepted, rejected, expired, converted'
    }),
    items: Joi.array().items(Joi.object({
      // Inventory fields (flat structure)
      supplierId: Joi.string().hex().length(24).optional().messages({
        'any.required': 'Supplier ID is required',
        'string.hex': 'Supplier ID must be a valid ObjectId',
        'string.length': 'Supplier ID must be 24 characters long'
      }),
      name: Joi.string().trim().max(200).required().messages({
        'string.max': 'Product name cannot exceed 200 characters',
        'any.required': 'Product name is required'
      }),
      type: Joi.string().valid('car', 'part').required().messages({
        'any.only': 'Product type must be car or part',
        'any.required': 'Product type is required'
      }),
      category: Joi.string().trim().max(100).required().messages({
        'string.max': 'Category cannot exceed 100 characters',
        'any.required': 'Category is required'
      }),
      subcategory: Joi.string().trim().max(100).optional().messages({
        'string.max': 'Subcategory cannot exceed 100 characters'
      }),
      brand: Joi.string().trim().max(100).required().messages({
        'string.max': 'Brand cannot exceed 100 characters',
        'any.required': 'Brand is required'
      }),
      model: Joi.string().trim().max(100).optional().messages({
        'string.max': 'Model cannot exceed 100 characters'
      }),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
        'number.integer': 'Year must be an integer',
        'number.min': 'Year must be at least 1900',
        'number.max': 'Year cannot be in the future'
      }),
      color: Joi.string().trim().max(50).optional().messages({
        'string.max': 'Color cannot exceed 50 characters'
      }),
      sku: Joi.string().trim().uppercase().required().messages({
        'any.required': 'SKU is required'
      }),
      description: Joi.string().trim().max(1000).optional().messages({
        'string.max': 'Description cannot exceed 1000 characters'
      }),
      costPrice: Joi.number().min(0).required().messages({
        'number.min': 'Cost price cannot be negative',
        'any.required': 'Cost price is required'
      }),
      sellingPrice: Joi.number().min(0).required().messages({
        'number.min': 'Selling price cannot be negative',
        'any.required': 'Selling price is required'
      }),
      condition: Joi.string().valid('new', 'used', 'refurbished', 'damaged').messages({
        'any.only': 'Condition must be new, used, refurbished, or damaged'
      }),
      status: Joi.string().valid('active', 'inactive', 'discontinued', 'out_of_stock').messages({
        'any.only': 'Status must be active, inactive, discontinued, or out_of_stock'
      }),
      
      // VIN and Interior Color fields
      vinNumbers: Joi.array().items(Joi.object({
        status: Joi.string().valid('active', 'inactive', 'hold', 'sold').default('active').messages({
          'any.only': 'VIN status must be active, inactive, hold, or sold'
        }),
        chasisNumber: Joi.string().trim().required().messages({
          'any.required': 'Chassis number is required for VIN'
        })
      })).optional(),
      interiorColor: Joi.string().trim().optional(),
      
      // Quotation-specific fields
      quantity: Joi.number().integer().min(1).required().messages({
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required'
      }),
      unitPrice: Joi.number().min(0).optional().messages({
        'number.min': 'Unit price cannot be negative'
      }),
    })).min(1).messages({
      'array.min': 'At least one item is required'
    }),
    totalDiscount: Joi.number().min(0).messages({
      'number.min': 'Total discount cannot be negative'
    }),
    discountType: Joi.string().valid('percentage', 'fixed').messages({
      'any.only': 'Discount type must be percentage or fixed'
    }),
    currency: Joi.string().length(3).uppercase().messages({
      'string.length': 'Currency must be exactly 3 characters',
      'string.uppercase': 'Currency must be uppercase'
    }),
    exchangeRate: Joi.number().min(0).messages({
      'number.min': 'Exchange rate cannot be negative'
    }),
    notes: Joi.string().max(1000).messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),
    deliveryAddress: Joi.object({
      street: Joi.string().max(200).messages({
        'string.max': 'Street address cannot exceed 200 characters'
      }),
      city: Joi.string().max(100).messages({
        'string.max': 'City cannot exceed 100 characters'
      }),
      state: Joi.string().max(100).messages({
        'string.max': 'State cannot exceed 100 characters'
      }),
      postalCode: Joi.string().max(20).messages({
        'string.max': 'Postal code cannot exceed 20 characters'
      }),
      country: Joi.string().max(100).messages({
        'string.max': 'Country cannot exceed 100 characters'
      })
    }).optional(),
    paymentTerms: Joi.string().valid('Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Prepaid', 'Other').messages({
      'any.only': 'Payment terms must be one of: Due on Receipt, Net 15, Net 30, Net 45, Net 60, Prepaid, Other'
    }),
    additionalExpenses: Joi.object({
      expenceType: Joi.string().valid('shipping', 'accessories', 'Rta Fees', 'COO Fees', 'Customs', 'Insurance', 'Other', 'none').messages({
        'any.only': 'Expense type must be one of: shipping, accessories, Rta Fees, COO Fees, Customs, Insurance, Other, none'
      }),
      description: Joi.string().trim().max(500).messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
      amount: Joi.number().min(0).messages({
        'number.min': 'Amount cannot be negative'
      })
    }).optional()
  }).min(1), // At least one field must be provided

  updateQuotationStatus: Joi.object({
    status: Joi.string().valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted').required().messages({
      'any.only': 'Status must be one of: draft, sent, viewed, accepted, rejected, expired, converted',
      'any.required': 'Status is required'
    })
  }),

  updateAcceptedQuotation: Joi.object().unknown(true).min(1), // Allow any fields, at least one must be provided

  quotationFilters: Joi.object({
    search: Joi.string().min(1).max(100).messages({
      'string.min': 'Search term must be at least 1 character long',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
    status: Joi.string().valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'),
    customerId: Joi.string().min(1).max(20).messages({
      'string.min': 'Customer ID must be at least 1 character long',
      'string.max': 'Customer ID cannot exceed 20 characters'
    }),
    createdBy: Joi.string().hex().length(24),
    dateFrom: Joi.date().max('now'),
    dateTo: Joi.date().max('now'),
    validTillFrom: Joi.date().max('now'),
    validTillTo: Joi.date().max('now')
  }),

  // Customer Invoice schemas
  createCustomerInvoice: Joi.object({
    quotationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid quotation ID format',
      'any.required': 'Quotation ID is required'
    }),
    notes: Joi.string().allow('').optional().max(1000),
    exportTo: Joi.string().max(200).optional().messages({
      'string.max': 'Export destination cannot exceed 200 characters'
    }),
    moreExpense: Joi.object({
      description: Joi.string().allow('').optional().default(''),
      amount: Joi.number().min(0).default(0)
    }).default({ description: '', amount: 0 }),
    customerPayment: Joi.object({
      paymentAmount: Joi.number().min(0).default(0),
      paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'cheque', 'other').default('cash'),
      paymentNotes: Joi.string().max(500).default(''),
      paymentDate: Joi.date()
    }).default({
      paymentAmount: 0,
      paymentMethod: 'cash',
      paymentNotes: ''
    })
  }),

  // Employee creation schema
  createEmployee: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
    phone: Joi.string().min(7).max(15).required().messages({
      'string.min': 'Phone number must be at least 7 characters long',
      'string.max': 'Phone number cannot exceed 15 characters',
      'any.required': 'Phone number is required'
    }),
    roleType: Joi.string().valid('SALES', 'FINANCE').required().messages({
      'any.only': 'Role type must be SALES or FINANCE',
      'any.required': 'Role type is required'
    }),
    address: Joi.string().max(500).optional().messages({
      'string.max': 'Address cannot exceed 500 characters'
    }),
    status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
      'string.pattern.base': 'Country code must start with + followed by 1-3 digits (e.g., +1, +971, +44)',
      'any.required': 'Country code is required'
    })
  })
};

module.exports = {
  validate,
  schemas
};
