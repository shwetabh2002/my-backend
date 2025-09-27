const mongoose = require('mongoose');

const customerInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
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
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  company: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    phone: String,
    email: String,
    website: String,
    taxId: String,
    registrationNumber: String
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    supplierName: String,
    vinNumber: String,
    chassisNumber: String,
    engineNumber: String,
    year: Number,
    make: String,
    model: String,
    color: String,
    mileage: Number,
    condition: String
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
  additionalExpenses: {
    description: String,
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
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
    enum: ['cash', 'bank_transfer', 'cheque', 'other'],
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
    required: true
  },
  notes: String,
  termsAndConditions: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
customerInvoiceSchema.index({ invoiceNumber: 1 });
customerInvoiceSchema.index({ quotationId: 1 });
customerInvoiceSchema.index({ quotationNumber: 1 });
customerInvoiceSchema.index({ 'customer.custId': 1 });
customerInvoiceSchema.index({ status: 1 });
customerInvoiceSchema.index({ createdAt: -1 });
customerInvoiceSchema.index({ dueDate: 1 });

// Virtual for invoice age
customerInvoiceSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
customerInvoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && this.status !== 'cancelled' && this.status !== 'refunded' && new Date() > this.dueDate;
});

// Pre-save middleware to generate invoice number
customerInvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.invoiceNumber = `CI-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
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
