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
      name: 'AL KARAMA MOTORS FZE',
      legalName: 'AL KARAMA MOTORS FZE',
      industry: 'Automotive', // Change this to your industry
      businessType: 'Corporation', // Change this to your business type
      description: 'Automotive dealership specializing in car sales and exports',
      taxId: '12-3456789', // Replace with your actual tax ID
      registrationNumber: 'YB123456', // Replace with your actual registration number
      incorporationDate: new Date('2020-01-01'), // Replace with your actual incorporation date
      website: 'https://www.alkaramamotors.com', // Replace with your actual website
      email: 'info@alkaramamotors.com', // Replace with your actual email
      phone: '+971 43337699', // Replace with your actual phone
      fax: '+971 43337698', // Replace with your actual fax (optional)
      address: {
        street: 'Show Room No:377, Ducamz (Dubai Auto Zone)',
        city: 'Ras Al Khor',
        state: 'Dubai',
        postalCode: '00000',
        country: 'UAE'
      },
      billingAddress: {
        street: 'Show Room No:377, Ducamz (Dubai Auto Zone)',
        city: 'Ras Al Khor',
        state: 'Dubai',
        postalCode: '00000',
        country: 'UAE'
      },
      shippingAddress: {
        street: 'Show Room No:377, Ducamz (Dubai Auto Zone)',
        city: 'Ras Al Khor',
        state: 'Dubai',
        postalCode: '00000',
        country: 'UAE'
      },
      contacts: [
        {
          name: 'AL KARAMA MOTORS FZE',
          email: 'info@alkaramamotors.com',
          phone: '+971 43337699',
          position: 'Business Entity',
          isPrimary: true
        }
      ],
      annualRevenue: 1000000, // Replace with your actual revenue
      currency: 'AED',
      creditLimit: 0, // Not applicable for owner company
      paymentTerms: 'Due on Receipt', // Your payment terms
      bankDetails: {
        bankName: 'COMMERCIAL BANK OF DUBAI',
        accountName: 'AL KARAMA MOTORS FZE',
        accountNumber: '1002462883',
        iban: 'AE490230000001002462883',
        swiftCode: 'CBDUAEAD'
      },
      status: 'active',
      priority: 'critical',
      customerTier: 'enterprise', // Not applicable for owner company
      isOwner: true, // This marks it as your company
      socialMedia: {
        linkedin: 'https://linkedin.com/company/alkaramamotors',
        twitter: 'https://twitter.com/alkaramamotors',
        facebook: 'https://facebook.com/alkaramamotors'
      },
      tags: ['owner', 'automotive', 'car-dealership', 'export'],
      categories: ['Automotive', 'Car Dealership'],
      notes: 'AL KARAMA MOTORS FZE - Automotive dealership specializing in car sales and exports',
      internalNotes: 'Owner company - used for invoices, quotations, and business documents',
      createdBy: adminUser._id,
      termCondition: {
        export: {
          price: "The price is for sale outside the GCC (export). The prices are Ex our Work (Does Not Include Freight or Insurance Charges).",
          delivery: "Ex-Stock, Subject to prior Sale. After the full payment, the car will be delivered to the Dubai Showroom within 3 to 4 working days.",
          payment: "100% advance payment before delivery. By Cheque/Cash/ Swift Transfer.",
          validity: "3 working days from the date of issue"
        }
      },
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
