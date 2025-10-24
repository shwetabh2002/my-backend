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
      name: 'PLANET SKY NEW AUTOMOBILE TRADING LLC',
      legalName: 'PLANET SKY NEW AUTOMOBILE TRADING LLC',
      industry: 'Automotive',
      businessType: 'Corporation',
      description: 'Automotive dealership specializing in car sales and exports',
      taxId: '12-3456789',
      registrationNumber: 'YB123456',
      incorporationDate: new Date('2020-01-01T00:00:00.000Z'),
      website: 'www.planet-sky.com',
      email: 'info@planet-sky.com',
      phone: '+971(4) 326 9576',
      fax: '+971(4) 326 9576',
      address: {
        street: 'Samari Retail, building R1008, Office AF06',
        city: 'Ras Al Khor',
        state: 'United Arab Emirates',
        postalCode: '00000',
        country: 'UAE'
      },
      billingAddress: {
        street: 'Samari Retail, building R1008, Office AF06',
        city: 'Ras Al Khor',
        state: 'United Arab Emirates',
        postalCode: '00000',
        country: 'UAE'
      },
      shippingAddress: {
        street: 'Samari Retail, building R1008, Office AF06',
        city: 'Ras Al Khor',
        state: 'United Arab Emirates',
        postalCode: '00000',
        country: 'UAE'
      },
      contacts: [
        {
          name: 'PLANET SKY NEW AUTOMOBILE TRADING LLC',
          email: 'info@planet-sky.com',
          phone: '+971(4) 326 9576',
          position: 'Business Entity',
          isPrimary: true
        }
      ],
      currency: 'AED',
      creditLimit: 0,
      paymentTerms: 'Due on Receipt',
      bankDetails: new Map([
        ['AED', {
          bankName: 'Mashreq Bank',
          accountName: 'PLANET SKY NEW AUTOMOBILE TRADING LLC',
          accountNumber: '19101380548',
          iban: 'AE520330000019101380548',
          swiftCode: 'BOMLAEAD',
          branch: 'Mashreq NEO [099]',
          address: 'AL GHURAIR CITY, 339-C, AGC, AL RIQQA STREET, DUBAI – UAE'
        }],
        ['USD', {
          bankName: 'Mashreq Bank',
          accountName: 'PLANET SKY NEW AUTOMOBILE TRADING LLC',
          accountNumber: '19101380549',
          iban: 'AE250330000019101380549',
          swiftCode: 'BOMLAEAD',
          branch: 'Mashreq NEO [099]',
          address: 'AL GHURAIR CITY, 339-C, AGC, AL RIQQA STREET, DUBAI – UAE'
        }],
        ['EURO', {
          bankName: 'Mashreq Bank',
          accountName: 'PLANET SKY NEW AUTOMOBILE TRADING LLC',
          accountNumber: '19101380550',
          iban: 'AE950330000019101380550',
          swiftCode: 'BOMLAEAD',
          branch: 'Mashreq NEO [099]',
          address: 'AL GHURAIR CITY, 339-C, AGC, AL RIQQA STREET, DUBAI – UAE'
        }]
      ]),
      status: 'active',
      isOwner: true,
      priority: 'critical',
      customerTier: 'enterprise',
      socialMedia: {
        linkedin: 'https://linkedin.com/company/alkaramamotors',
        twitter: 'https://twitter.com/alkaramamotors',
        facebook: 'https://facebook.com/alkaramamotors'
      },
      tags: [
        'owner',
        'automotive',
        'car-dealership',
        'export'
      ],
      categories: [
        'Automotive',
        'Car Dealership'
      ],
      notes: 'PLANET SKY NEW AUTOMOBILE TRADING LLC - Automotive dealership specializing in car sales and exports',
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
      lastActivityDate: new Date(),
      companyCode: 'COMP-000001',
      VAT: 0
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
