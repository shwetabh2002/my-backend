const { required, date } = require('joi');
const mongoose = require('mongoose');

// Quotation item schema with embedded inventory fields
const quotationItemSchema = new mongoose.Schema({
  // Inventory fields (embedded directly)
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    required: true,
    enum: ['car', 'part']
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  model: {
    type: String,
    trim: true,
    maxlength: 100
  },
  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
    trim: true,
    maxlength: 50
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  specifications: {
    type: Map,
    of: String
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'refurbished', 'damaged'],
    default: 'new'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // VIN and Interior Color fields
  vinNumbers: [{
    status: {
      type: String,
      enum: ['active', 'inactive', 'hold', 'sold'],
      default: 'active'
    },
    chasisNumber: {
      type: String,
      trim: true
    }
  }],
  interiorColor: {
    type: String,
    trim: true
  },
  
  // Quotation-specific fields
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true,
  }
}, { _id: false });

// Set _id: false for vinNumbers array
quotationItemSchema.path('vinNumbers').schema.set('_id', false);

const quotationSchema = new mongoose.Schema({
  // Quotation Identification
  quotationId: {
    type: String,
    unique: true,
  },
  quotationNumber: {
    type: String,
    unique: true,
  },
  // Customer Information
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    custId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    address:{
      type:String,
      required:true
    }
  },
  validTill: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
    }
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
    default: 'draft',
    required: true,
    index: true
  },
  statusHistory: {
    type: [{
      status: {
        type: String,
        enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    }],
    _id: false
  },
  
  // Items
  items: [quotationItemSchema],

  // Additional Expenses
  additionalExpenses: {
    expenceType:{
      type: String,
      enum: ['shipping', 'accessories', 'Rta Fees',"COO Fees","Customs","Insurance","Other","none"],
      required: false
    },
    description:{
      type: String,
      required: false
    },
    amount:{
      type: Number,
      required: false,
      default: 0
    },
    currency:{
      type: String,
      required: false,
      default: 'AED'
    }
  },
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  vatAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Currency
  currency: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 3,
    default: 'AED'
  },
  // Terms and Conditions
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Delivery Information
  deliveryAddress: {
    type:String,

  },
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  VAT: {
    type: Number,
    default:5
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
quotationSchema.index({ quotationId: 1 });
quotationSchema.index({ quotationNumber: 1 });
quotationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Quotation', quotationSchema);