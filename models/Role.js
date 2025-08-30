const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    enum: {
      values: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'],
      message: 'Role must be ADMIN, EMPLOYEE, or CUSTOMER'
    }
  },
  permissions: [{
    type: String,
    required: [true, 'At least one permission is required'],
    // enum: {
    //   values: [
    //     'user:create',
    //     'user:read',
    //     'user:update',
    //     'user:delete',
    //     'role:create',
    //     'role:read',
    //     'role:update',
    //     'role:delete',
    //     'auth:login'
    //   ],
    //   message: 'Invalid permission'
    // }
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

// Virtual for user count
roleSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'roleIds',
  count: true
});

// Pre-save middleware
roleSchema.pre('save', function(next) {
  // Ensure name is uppercase
  if (this.name) {
    this.name = this.name.toUpperCase();
  }
  next();
});

// Static method to get role by name
roleSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toUpperCase(), isActive: true });
};

// Instance method to check if role has specific permission
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

module.exports = mongoose.model('Role', roleSchema);
