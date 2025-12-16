const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  // Receipt identification
  receiptNumber: {
    type: String,
    unique: true,
    trim: true,
    maxlength: [50, 'Receipt number cannot exceed 50 characters']
  },

  // Reference to related quotation
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: false
  },

  // Customer information (similar to quotation structure)
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer user ID is required']
    },
    custId: {
      type: String,
      required: [true, 'Customer ID is required'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      maxlength: [100, 'Customer email cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Customer address is required'],
      trim: true,
      maxlength: [500, 'Customer address cannot exceed 500 characters']
    },
    countryCode: {
      type: String,
      default: '+971',
      trim: true,
      maxlength: [10, 'Country code cannot exceed 10 characters']
    },
    trn: {
      type: String,
      trim: true,
      maxlength: [50, 'TRN cannot exceed 50 characters']
    }
  },

  // Payment details
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    trim: true,
    maxlength: [50, 'Payment method cannot exceed 50 characters']
  },

  // Receipt date
  receiptDate: {
    type: Date,
    required: [true, 'Receipt date is required'],
    default: Date.now
  },

  // Financial details
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },

  currency: {
    type: String,
    required: [true, 'Currency is required'],
    trim: true,
    uppercase: true,
    length: [3, 'Currency must be 3 characters'],
    default: 'AED'
  },

  // Description
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },


  // User references
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total amount (same as amount for receipts)
receiptSchema.virtual('totalAmount').get(function() {
  return this.amount;
});

// Pre-save middleware to generate receipt number
receiptSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    try {
      // Generate receipt number: PN000001, PN000002, PN000003, etc.
      const count = await this.constructor.countDocuments({
        receiptNumber: { $regex: '^PN' }
      });
      this.receiptNumber = `PN${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Indexes for better query performance
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ 'customer.userId': 1 });
receiptSchema.index({ 'customer.custId': 1 });
receiptSchema.index({ receiptDate: 1 });
receiptSchema.index({ createdBy: 1 });
receiptSchema.index({ createdAt: -1 });
receiptSchema.index({ quotationId: 1 });

// Compound indexes
receiptSchema.index({ 'customer.userId': 1, receiptDate: -1 });
receiptSchema.index({ currency: 1, receiptDate: -1 });
receiptSchema.index({ quotationId: 1, receiptDate: -1 });

// Text search index
receiptSchema.index({
  receiptNumber: 'text',
  'customer.name': 'text',
  'customer.email': 'text',
  description: 'text'
});

module.exports = mongoose.model('Receipt', receiptSchema);