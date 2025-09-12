const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'United States'
  }
}, { _id: false });

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
  position: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const companySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  legalName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  companyCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    maxlength: 20,
    index: true
  },
  
  // Business Information
  industry: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  businessType: {
    type: String,
    required: true,
    enum: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship', 'Non-Profit', 'Government', 'Other'],
    default: 'Corporation'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Legal Information
  taxId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 50,
    index: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 50
  },
  incorporationDate: {
    type: Date
  },
  
  // Contact Information
  website: {
    type: String,
    trim: true,
    maxlength: 200,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    index: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
    index: true
  },
  fax: {
    type: String,
    trim: true,
    maxlength: 20
  },
  
  // Address Information
  address: {
    type: addressSchema,
    required: true
  },
  billingAddress: {
    type: addressSchema
  },
  shippingAddress: {
    type: addressSchema
  },
  
  // Contact Persons
  contacts: [contactSchema],
  
  // Financial Information
  annualRevenue: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3,
    uppercase: true
  },
  creditLimit: {
    type: Number,
    min: 0,
    default: 0
  },
  paymentTerms: {
    type: String,
  },
  
  // Status and Classification
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending', 'archived'],
    default: 'active',
    index: true
  },
  isOwner: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  customerTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'enterprise'],
    default: 'bronze',
    index: true
  },
  
  // Social Media
  socialMedia: {
    linkedin: {
      type: String,
      trim: true,
      maxlength: 200
    },
    twitter: {
      type: String,
      trim: true,
      maxlength: 200
    },
    facebook: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  
  // Tags and Categories
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  categories: [{
    type: String,
    trim: true,
    maxlength: 100
  }],
  
  // Metadata
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  VAT:{
    type:Number
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
  lastContactDate: {
    type: Date
  },
  lastActivityDate: {
    type: Date,
    default: Date.now
  },
  termCondition:{
    type:String
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
companySchema.index({ name: 'text', legalName: 'text', description: 'text' });
companySchema.index({ industry: 1, businessType: 1 });
companySchema.index({ status: 1, priority: 1, customerTier: 1 });
companySchema.index({ createdAt: -1 });
companySchema.index({ lastActivityDate: -1 });

// Virtual for full address
companySchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.postalCode}, ${addr.country}`;
});

// Virtual for primary contact
companySchema.virtual('primaryContact').get(function() {
  return this.contacts.find(contact => contact.isPrimary) || this.contacts[0];
});

// Virtual for company age
companySchema.virtual('companyAge').get(function() {
  if (!this.incorporationDate) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.incorporationDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 365);
});

// Pre-save middleware to generate company code
companySchema.pre('save', async function(next) {
  if (this.isNew && !this.companyCode) {
    try {
      const count = await this.constructor.countDocuments();
      this.companyCode = `COMP-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to ensure only one primary contact
companySchema.pre('save', function(next) {
  if (this.contacts && this.contacts.length > 0) {
    const primaryContacts = this.contacts.filter(contact => contact.isPrimary);
    if (primaryContacts.length > 1) {
      // Keep only the first primary contact
      this.contacts.forEach((contact, index) => {
        if (index > 0) contact.isPrimary = false;
      });
    } else if (primaryContacts.length === 0) {
      // Set first contact as primary if none is set
      this.contacts[0].isPrimary = true;
    }
  }
  next();
});

// Instance methods
companySchema.methods.isActive = function() {
  return this.status === 'active';
};

companySchema.methods.isHighPriority = function() {
  return ['high', 'critical'].includes(this.priority);
};

companySchema.methods.hasContact = function(email) {
  return this.contacts.some(contact => contact.email === email);
};

companySchema.methods.addContact = function(contactData) {
  this.contacts.push(contactData);
  return this.save();
};

companySchema.methods.updateLastActivity = function() {
  this.lastActivityDate = new Date();
  return this.save();
};

// Static methods
companySchema.statics.findByIndustry = function(industry) {
  return this.find({ industry: new RegExp(industry, 'i') });
};

companySchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

companySchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

companySchema.statics.findByPriority = function(priority) {
  return this.find({ priority });
};

companySchema.statics.findByCustomerTier = function(tier) {
  return this.find({ customerTier: tier });
};

companySchema.statics.searchCompanies = function(searchTerm) {
  return this.find({
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { legalName: new RegExp(searchTerm, 'i') },
      { email: new RegExp(searchTerm, 'i') },
      { 'contacts.email': new RegExp(searchTerm, 'i') },
      { 'contacts.name': new RegExp(searchTerm, 'i') }
    ]
  });
};

companySchema.statics.getCompanyStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalCompanies: { $sum: 1 },
        activeCompanies: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        inactiveCompanies: {
          $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
        },
        suspendedCompanies: {
          $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
        },
        byIndustry: {
          $push: {
            industry: '$industry',
            status: '$status'
          }
        },
        byTier: {
          $push: {
            tier: '$customerTier',
            status: '$status'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Company', companySchema);
