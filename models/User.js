const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    trim: true,
    match: [
      /^\+\d{1,3}$/,
      'Country code must start with + followed by 1-3 digits'
    ]
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    maxlength: [15, 'Phone cannot exceed 15 characters'],
    match: [
      /^\+?[\d\s\-\(\)]+$/,
      'Please enter a valid phone number'
    ]
  },
  custId: {
    type: String,
    unique: true,
    sparse: true, // Only create index if field exists
    trim: true,
    uppercase: true,
    match: [/^(CUS|SUP)-\d{3}$/, 'ID must be in format CUS-XXX or SUP-XXX']
  },
  password: {
    type: String,
    required: function() {
      // Password is only required for employees and admins, not for customers or suppliers
      return this.type !== 'customer' && this.type !== 'supplier';
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  type: {
    type: String,
    required: [true, 'User type is required'],
    enum: {
      values: ['employee', 'admin', 'customer', 'supplier'],
      message: 'User type must be employee, admin, customer, or supplier'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  roleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'At least one role is required']
  }],
  lastLogin: {
    type: Date
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  trn: {
    type: String,
    trim: true,
    maxlength: [50, 'TRN number cannot exceed 50 characters'],
  },
  refreshToken: {
    type: String,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ custId: 1 });
userSchema.index({ type: 1 });
userSchema.index({ status: 1 });
userSchema.index({ roleIds: 1 });

// Virtual for roles (populated)
userSchema.virtual('roles', {
  ref: 'Role',
  localField: 'roleIds',
  foreignField: '_id'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and exists
  if (!this.isModified('password') || !this.password) return next();

  // Check if password is already hashed (starts with $2a$)
  if (this.password.startsWith('$2a$')) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate custId for customers and suppliers
userSchema.pre('save', async function(next) {
  if (this.isNew && (this.type === 'customer' || this.type === 'supplier') && !this.custId) {
    try {
      const prefix = this.type === 'customer' ? 'CUS' : 'SUP';
      
      // Find the highest existing ID for this type
      const lastUser = await this.constructor.findOne(
        { type: this.type, custId: { $regex: `^${prefix}-` } },
        { custId: 1 },
        { sort: { custId: -1 } }
      );
      
      let nextNumber = 1;
      if (lastUser && lastUser.custId) {
        const lastNumber = parseInt(lastUser.custId.split('-')[1]);
        nextNumber = lastNumber + 1;
      }
      
      // Generate new ID with zero-padded number
      this.custId = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to validate user type and roles
userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('type') || this.isModified('roleIds')) {
    try {
      // Validate that customer and supplier users don't have login capabilities
      if (this.type === 'customer' || this.type === 'supplier') {
        const Role = mongoose.model('Role');
        const userRole = await Role.findOne({ name: this.type.toUpperCase() });
        if (!userRole) {
          // Create the role if it doesn't exist
          const newRole = new Role({
            name: this.type.toUpperCase(),
            permissions: [],
            description: `${this.type} role with no system access`
          });
          await newRole.save();
          this.roleIds = [newRole._id];
        } else {
          // Ensure customer/supplier only has their respective role
          this.roleIds = [userRole._id];
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Customers don't have passwords, so they can't login
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if user has specific permission
userSchema.methods.hasPermission = async function(permission) {
  const Role = mongoose.model('Role');
  const roles = await Role.find({ _id: { $in: this.roleIds } });
  return roles.some(role => role.hasPermission(permission));
};

// Instance method to check if user has specific role
userSchema.methods.hasRole = async function(roleName) {
  const Role = mongoose.model('Role');
  const role = await Role.findOne({ name: roleName.toUpperCase() });
  return role && this.roleIds.includes(role._id);
};

// Static method to find users by role
userSchema.statics.findByRole = function(roleName) {
  return this.find({ roleIds: roleName });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.model('User', userSchema);
