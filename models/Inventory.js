const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Basic product information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },

  // Product type (car or part)
  type: {
    type: String,
    required: [true, 'Product type is required'],
    enum: {
      values: ['car', 'part'],
      message: 'Product type must be either car or part'
    }
  },
  
  // Category for better organization
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  
  // Subcategory for more specific classification
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot exceed 100 characters']
  },
  
  // Brand/Manufacturer
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [100, 'Brand cannot exceed 100 characters']
  },
  
  // Model (especially for cars)
  model: {
    type: String,
    trim: true,
    maxlength: [100, 'Model cannot exceed 100 characters']
  },
  
  // Year (for cars)
  year: {
    type: Number,
    min: [1900, 'Year must be at least 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  
  // Color (for cars)
  color: {
    type: String,
    trim: true,
    maxlength: [50, 'Color cannot exceed 50 characters']
  },
  
  // SKU (Stock Keeping Unit)
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9-]+$/, 'SKU can only contain uppercase letters, numbers, and hyphens']
  },
  
  // Description
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Compatibility (for parts - which cars/models they fit)
  compatibility: [{
    brand: String,
    model: String,
    yearFrom: Number,
    yearTo: Number,
    notes: String
  }],
  
  // Pricing
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative']
  },
  
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  vinNumber:[
    {
      status:{
        type:String,
        enum: {
          values: ['active', 'inactive', 'discontinued', 'out_of_stock','sold','hold'],
          message: 'Status must be active, inactive, discontinued, sold,hold or out_of_stock'
        },
      },
      chasisNumber:{
        type:String,
      }
    },
  ],
  interiorColor:{
    type:String,
  },
  // Stock management
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  inStock: {
    type: Boolean,
    default: true
  },

  // Condition
  condition: {
    type: String,
    enum: {
      values: ['new', 'used', 'refurbished', 'damaged'],
      message: 'Condition must be new, used, refurbished, or damaged'
    },
    default: 'new'
  },
  
  // Status
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'discontinued', 'out_of_stock','sold','hold'],
      message: 'Status must be active, inactive, discontinued, or out_of_stock'
    },
    default: 'active'
  },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Dimensions and weight (for shipping calculations)
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number
  },
  
  // Tags for search
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
inventorySchema.index({ sku: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ brand: 1 });
inventorySchema.index({ color: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ tags: 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ createdBy: 1 });

// Compound indexes for common queries
inventorySchema.index({ type: 1, category: 1 });
inventorySchema.index({ brand: 1, model: 1 });
inventorySchema.index({ category: 1, subcategory: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
