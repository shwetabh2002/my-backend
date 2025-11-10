const mongoose = require('mongoose');

const customerInvoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
    trim: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    trim: true
  },
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: true
  },
  quotationNumber: {
    type: String,
    required: true,
    trim: true
  },
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    custId: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: String,
    trn: {
      type: String,
      trim: true,
      maxlength: 50
    }
  },
  items: [{
    // Inventory fields (embedded directly) - same as quotation
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
    
    // Invoice-specific fields
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    totalPrice: {
      type: Number,
      required: true,
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Additional Expenses (Array of expense objects)
  additionalExpenses: [{
    description: String,
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    expenceType: {
      type: String,
      enum: ['shipping', 'accessories', 'Rta Fees', "COO Fees", "Customs", "Insurance", "Other", "none"],
      required: false
    }
  }],
  moreExpense:{
    description: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  VAT: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  vatAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalTotal: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'AED',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  customerPayment: {
    paymentStatus: {
    type: String,
    enum: ['partially_paid', 'fully_paid', 'due'],
    default: 'due'
    },
    paymentAmount: {
    type: Number,
    default: 0
    },
    paymentDate: {
    type: Date,
    },
    paymentMethod: {
    type: String,
    default: 'cash'
    },
    paymentNotes: {
    type: String,
    default: ''
    }
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  dueDate: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day default
    }
  },
  notes: {
    type: String,
    required: false,
    trim: true,
    maxlength: 1000
  },
  exportTo: {
    type: String,
    trim: true,
    maxlength: 200
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quotationCreatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
customerInvoiceSchema.index({ invoiceId: 1 });
customerInvoiceSchema.index({ invoiceNumber: 1 });
customerInvoiceSchema.index({ quotationId: 1 });
customerInvoiceSchema.index({ quotationNumber: 1 });
customerInvoiceSchema.index({ 'customer.custId': 1 });
customerInvoiceSchema.index({ status: 1 });
customerInvoiceSchema.index({ createdAt: -1 });
customerInvoiceSchema.index({ dueDate: 1 });
customerInvoiceSchema.index({ status: 1, createdAt: -1, currency: 1 });
customerInvoiceSchema.index({ 'customer.custId': 1, status: 1 });
customerInvoiceSchema.index({ createdBy: 1, createdAt: -1 });
customerInvoiceSchema.index({ quotationCreatedBy: 1, createdAt: -1 });
customerInvoiceSchema.index({ currency: 1, status: 1, finalTotal: -1 });

// Virtual for invoice age
customerInvoiceSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
customerInvoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && this.status !== 'cancelled' && this.status !== 'refunded' && new Date() > this.dueDate;
});

// Pre-save middleware to generate invoice ID and number
customerInvoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const count = await this.constructor.countDocuments();
      const year = new Date().getFullYear();
      const sequence = String(count + 1).padStart(4, '0');
      
      // Generate invoiceId (internal ID - format: CI-YYYY-XXXXXX)
      this.invoiceId = `CI-${year}-${String(count + 1).padStart(6, '0')}`;
      
      // Generate invoiceNumber (display number - longer format, like quotationNumber)
      this.invoiceNumber = `CI-${year}-${sequence}`;
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Pre-save middleware to add status history
customerInvoiceSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      date: new Date(),
      updatedBy: this.updatedBy
    });
  }
  next();
});

module.exports = mongoose.model('CustomerInvoice', customerInvoiceSchema);
