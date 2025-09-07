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
  
  // Specifications (for parts)
  specifications: {
    type: Map,
    of: String
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
  
  minStockLevel: {
    type: Number,
    min: [0, 'Minimum stock level cannot be negative'],
    default: 5
  },
  
  maxStockLevel: {
    type: Number,
    min: [0, 'Maximum stock level cannot be negative']
  },
  
  // Location in warehouse
  location: {
    warehouse: {
      type: String,
      trim: true,
      maxlength: [50, 'Warehouse name cannot exceed 50 characters']
    },
    aisle: {
      type: String,
      trim: true,
      maxlength: [20, 'Aisle cannot exceed 20 characters']
    },
    shelf: {
      type: String,
      trim: true,
      maxlength: [20, 'Shelf cannot exceed 20 characters']
    },
    bin: {
      type: String,
      trim: true,
      maxlength: [20, 'Bin cannot exceed 20 characters']
    }
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
      values: ['active', 'inactive', 'discontinued', 'out_of_stock'],
      message: 'Status must be active, inactive, discontinued, or out_of_stock'
    },
    default: 'active'
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
inventorySchema.index({ 'location.warehouse': 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ createdBy: 1 });

// Compound indexes for common queries
inventorySchema.index({ type: 1, category: 1 });
inventorySchema.index({ brand: 1, model: 1 });
inventorySchema.index({ category: 1, subcategory: 1 });

// Virtual for profit margin
inventorySchema.virtual('profitMargin').get(function() {
  if (this.costPrice > 0) {
    return ((this.sellingPrice - this.costPrice) / this.costPrice * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.minStockLevel) return 'low_stock';
  if (this.maxStockLevel && this.quantity >= this.maxStockLevel) return 'overstocked';
  return 'in_stock';
});

// Virtual for total value
inventorySchema.virtual('totalValue').get(function() {
  return this.costPrice * this.quantity;
});

// Pre-save middleware to update status based on quantity
inventorySchema.pre('save', function(next) {
  // Auto-update status based on quantity
  if (this.quantity === 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock' && this.quantity > 0) {
    this.status = 'active';
  }
  
  // Auto-update tags if not provided
  if (!this.tags || this.tags.length === 0) {
    this.tags = [this.brand.toLowerCase(), this.category.toLowerCase()];
    if (this.subcategory) {
      this.tags.push(this.subcategory.toLowerCase());
    }
  }
  
  next();
});

// Instance method to check if item is in stock
inventorySchema.methods.isInStock = function() {
  return this.quantity > 0 && this.status === 'active';
};

// Instance method to check if stock is low
inventorySchema.methods.isLowStock = function() {
  return this.quantity <= this.minStockLevel;
};

// Instance method to update stock
inventorySchema.methods.updateStock = function(quantity, type = 'add') {
  if (type === 'add') {
    this.quantity += quantity;
  } else if (type === 'subtract') {
    if (this.quantity < quantity) {
      throw new Error('Insufficient stock');
    }
    this.quantity -= quantity;
  } else if (type === 'set') {
    this.quantity = quantity;
  }
  
  // Update status based on new quantity
  if (this.quantity === 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock' && this.quantity > 0) {
    this.status = 'active';
  }
  
  return this.quantity;
};

// Static method to find low stock items
inventorySchema.statics.findLowStock = function() {
  return this.find({
    $expr: { $lte: ['$quantity', '$minStockLevel'] },
    status: { $ne: 'discontinued' }
  });
};

// Static method to find out of stock items
inventorySchema.statics.findOutOfStock = function() {
  return this.find({ quantity: 0, status: { $ne: 'discontinued' } });
};

// Static method to find by category
inventorySchema.statics.findByCategory = function(category) {
  return this.find({ 
    category: { $regex: category, $options: 'i' },
    status: 'active'
  });
};

// Static method to find by brand
inventorySchema.statics.findByBrand = function(brand) {
  return this.find({ 
    brand: { $regex: brand, $options: 'i' },
    status: 'active'
  });
};

// Static method to find compatible parts
inventorySchema.statics.findCompatibleParts = function(brand, model, year) {
  return this.find({
    type: 'part',
    status: 'active',
    $or: [
      {
        'compatibility.brand': { $regex: brand, $options: 'i' },
        'compatibility.model': { $regex: model, $options: 'i' },
        $and: [
          { 'compatibility.yearFrom': { $lte: year } },
          { 'compatibility.yearTo': { $gte: year } }
        ]
      },
      {
        'compatibility.brand': { $regex: brand, $options: 'i' },
        'compatibility.model': { $regex: model, $options: 'i' },
        $or: [
          { 'compatibility.yearFrom': { $exists: false } },
          { 'compatibility.yearTo': { $exists: false } }
        ]
      }
    ]
  });
};

module.exports = mongoose.model('Inventory', inventorySchema);
