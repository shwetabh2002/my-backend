const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('../models/Company');
const User = require('../models/User');

const connectDB = async () => {
  try {
    if(process.env.NODE_ENV === 'production') {
      await mongoose.connect(process.env.MONGODB_URI_PRODUCTION);
    } else {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('MongoDB connected for owner company seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedOwnerCompany = async () => {
  try {
    // Check if owner company already exists
    const existingOwnerCompany = await Company.findOne({ isOwner: true });
    if (existingOwnerCompany) {
      console.log('Owner company already exists, skipping owner company creation');
      return existingOwnerCompany;
    }

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('Admin user not found, please run seed.js first');
      return;
    }

    // Create your company (the one selling products)
    const ownerCompany = new Company({
      name: 'Your Business Name',
      legalName: 'Your Business Name Inc.',
      industry: 'Technology', // Change this to your industry
      businessType: 'Corporation', // Change this to your business type
      description: 'Your business description - what you do and what you sell',
      taxId: '12-3456789', // Replace with your actual tax ID
      registrationNumber: 'YB123456', // Replace with your actual registration number
      incorporationDate: new Date('2020-01-01'), // Replace with your actual incorporation date
      website: 'https://www.yourbusiness.com', // Replace with your actual website
      email: 'info@yourbusiness.com', // Replace with your actual email
      phone: '+1-555-0000', // Replace with your actual phone
      fax: '+1-555-0001', // Replace with your actual fax (optional)
      address: {
        street: '123 Your Business Street',
        city: 'Your City',
        state: 'Your State',
        postalCode: '12345',
        country: 'United Arab Emirates'
      },
      billingAddress: {
        street: '123 Your Business Street',
        city: 'Your City',
        state: 'Your State',
        postalCode: '12345',
        country: 'United Arab Emirates'
      },
      shippingAddress: {
        street: '123 Your Business Street - Warehouse',
        city: 'Your City',
        state: 'Your State',
        postalCode: '12345',
        country: 'United Arab Emirates'
      },
      contacts: [
        {
          name: 'Your Name',
          email: 'your.email@yourbusiness.com',
          phone: '+1-555-0000',
          position: 'CEO/Owner',
          isPrimary: true
        },
        {
          name: 'Your Partner/Manager',
          email: 'partner@yourbusiness.com',
          phone: '+1-555-0002',
          position: 'Manager',
          isPrimary: false
        }
      ],
      annualRevenue: 1000000, // Replace with your actual revenue
      currency: 'AED',
      creditLimit: 0, // Not applicable for owner company
      paymentTerms: 'Due on Receipt', // Your payment terms
      status: 'active',
      priority: 'critical',
      customerTier: 'enterprise', // Not applicable for owner company
      isOwner: true, // This marks it as your company
      socialMedia: {
        linkedin: 'https://linkedin.com/company/yourbusiness',
        twitter: 'https://twitter.com/yourbusiness',
        facebook: 'https://facebook.com/yourbusiness'
      },
      tags: ['owner', 'business', 'your-industry'],
      categories: ['Your Industry', 'Your Category'],
      notes: 'This is your company that sells products to customers',
      internalNotes: 'Owner company - used for invoices, quotations, and business documents',
      createdBy: adminUser._id,
      termCondition: "  ksjefwed ewkc ewkfnewalfnewlDKewkc wedfnewlkfdmewcm wekcewlfinew ",
      VAT:10
    });

    await ownerCompany.save();
    console.log('Owner company created successfully:', ownerCompany.name);
    
    return ownerCompany;
  } catch (error) {
    console.error('Error creating owner company:', error);
    throw error;
  }
};

const runSeed = async () => {
  try {
    await connectDB();
    
    console.log('Starting owner company seeding...');
    console.log('⚠️  IMPORTANT: Please update the company details in this script with your actual business information!');
    
    await seedOwnerCompany();
    
    console.log('Owner company seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update the company details in scripts/seedOwnerCompany.js with your actual business information');
    console.log('2. Run the script again: npm run seed:owner-company');
    console.log('3. Use GET /companies/owner/company to retrieve your company details');
    console.log('4. Use GET /companies/owner/company/documents to get company details for invoices/quotations');
    
    process.exit(0);
  } catch (error) {
    console.error('Owner company seeding failed:', error);
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
