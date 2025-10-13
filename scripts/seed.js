const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Role = require('../models/Role');
const User = require('../models/User');

const connectDB = async () => {
  try {
    if(process.env.NODE_ENV === 'production') {
      await mongoose.connect(process.env.MONGODB_URI_PRODUCTION);
    } else {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedRoles = async () => {
  try {
    // Check if roles already exist
    const existingRoles = await Role.countDocuments();
    if (existingRoles > 0) {
      console.log('Roles already exist, skipping role creation');
      return;
    }

    const roles = [
      {
        name: 'ADMIN',
        permissions: [
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
          'quotation:delete',
          'supplier:create',
          'supplier:read',
          'supplier:update',
          'supplier:delete',
          'invoice:create',
          'invoice:read',
          'invoice:update',
          'invoice:delete',
          'expense:create',
          'expense:read',
          'expense:update',
          'expense:delete',
          'receipt:create',
          'receipt:read',
          'receipt:update',
          'receipt:delete'

        ],
        description: 'Full system access with all permissions'
      },
      {
        name: 'SALES',
        permissions: [
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
          'quotation:delete',
          'supplier:create',
          'supplier:read',
          'supplier:update',
          'supplier:delete',
          'invoice:create',
          'invoice:read',
          'invoice:update',
          'invoice:delete',
          'expense:create',
          'expense:read',
          'expense:update',
          'expense:delete',
          'receipt:create',
          'receipt:read',
          'receipt:update',
          'receipt:delete'

        ],
        description: 'Sales access with limited permissions'
      },
      {
        name: 'CUSTOMER',
        permissions: [],
        description: 'Customer role with no system access'
      },
      {
        name: 'SUPPLIER',
        permissions: [],
        description: 'Supplier role with no system access'
      },
      {
        name: 'FINANCE',
        permissions: [
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
          'quotation:delete',
          'supplier:create',
          'supplier:read',
          'supplier:update',
          'supplier:delete',
          'invoice:create',
          'invoice:read',
          'invoice:update',
          'invoice:delete',
          'expense:create',
          'expense:read',
          'expense:update',
          'expense:delete',
          'receipt:create',
          'receipt:read',
          'receipt:update',
          'receipt:delete'

        ],
        description: 'Finance role with access to financial data, invoices, quotations, receipts, and customer management'
      }
    ];

    const createdRoles = await Role.insertMany(roles);
    console.log('Roles created successfully:', createdRoles.map(r => r.name));
    
    return createdRoles;
  } catch (error) {
    console.error('Error creating roles:', error);
    throw error;
  }
};

const seedAdminUser = async (adminRole) => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists, skipping admin creation');
      return existingAdmin;
    }

    const adminUser = new User({
      name: 'System Administrator',
      countryCode: '+1',
      email: 'admin@example.com',
      password: 'admin123',
      type: 'admin',
      status: 'active',
      roleIds: [adminRole._id],
      address: '123 Main St, Anytown, USA',
      phone: '+1-555-0000'
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

const seedSampleUsers = async (employeeRole, financeRole, customerRole, supplierRole) => {
  try {
    // Check if sample users already exist
    const existingUsers = await User.countDocuments({ email: { $regex: /sample/ } });
    if (existingUsers > 0) {
      console.log('Sample users already exist, skipping sample user creation');
      return;
    }

    const sampleUsers = [
      {
        name: 'John Employee',
        countryCode: '+1',
        email: 'john.employee@example.com',
        phone: '+1-555-0123',
        password: 'employee123',
        type: 'employee',
        status: 'active',
        roleIds: [employeeRole._id],
        address: '123 Main St, Anytown, USA'
      },
      {
        name: 'Finance Manager',
        countryCode: '+1',
        email: 'finance@example.com',
        phone: '+1-555-0001',
        password: 'finance123',
        type: 'employee',
        status: 'active',
        roleIds: [financeRole._id],
        address: '456 Finance St, Anytown, USA'
      },
      {
        name: 'Jane Customer',
        countryCode: '+1',
        email: 'jane.customer@example.com',
        phone: '+1-555-0456',
        custId: 'CUS-001',
        type: 'customer',
        status: 'active',
        roleIds: [customerRole._id],
        address: '123 Main St, Anytown, USA'
      },
      {
        name: 'amy customer',
        countryCode: '+1',
        email: 'amy@example.com',
        phone: '+971-50-1234567',
        custId: 'CUS-002',
        type: 'customer',
        status: 'active',
        roleIds: [customerRole._id],
        address: 'dubai, california, UAE',
        trn: '1234567890'
      },
      {
        name: 'Auto Parts Supplier',
        countryCode: '+971',
        email: 'supplier1@autoparts.com',
        phone: '+971-50-1234567',
        custId: 'SUP-001',
        type: 'supplier',
        status: 'active',
        roleIds: [supplierRole._id],
        address: 'Dubai Industrial City, UAE'
      },
      {
        name: 'Car Accessories Ltd',
        countryCode: '+971',
        email: 'supplier2@accessories.com',
        phone: '+971-50-7654321',
        custId: 'SUP-002',
        type: 'supplier',
        status: 'active',
        roleIds: [supplierRole._id],
        address: 'Sharjah Industrial Area, UAE'
      }
    ];

    const createdUsers = await User.insertMany(sampleUsers);
    console.log('Sample users created successfully:', createdUsers.map(u => u.name));
    
    return createdUsers;
  } catch (error) {
    console.error('Error creating sample users:', error);
    throw error;
  }
};

const runSeed = async () => {
  try {
    await connectDB();
    
    console.log('Starting database seeding...');
    
    // Seed roles first
    const roles = await seedRoles();
    
    // Get role references
    const adminRole = roles.find(r => r.name === 'ADMIN');
    const employeeRole = roles.find(r => r.name === 'SALES');
    const financeRole = roles.find(r => r.name === 'FINANCE');
    const customerRole = roles.find(r => r.name === 'CUSTOMER');
    const supplierRole = roles.find(r => r.name === 'SUPPLIER');
    
    // Seed admin user
    await seedAdminUser(adminRole);
    
    // Seed sample users (including finance user)
    await seedSampleUsers(employeeRole, financeRole, customerRole, supplierRole);
    
    console.log('Database seeding completed successfully!');
    console.log('\nDefault credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Finance: finance@example.com / finance123');
    console.log('Sales: john.employee@example.com / employee123');
    console.log('Customer: jane.customer@example.com / customer123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
