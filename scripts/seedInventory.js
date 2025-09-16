const mongoose = require('mongoose');
require('dotenv').config();

const Inventory = require('../models/Inventory');
const User = require('../models/User');

const connectDB = async () => {
  try {
    if(process.env.NODE_ENV === 'production') {
      await mongoose.connect(process.env.MONGODB_URI_PRODUCTION);
    } else {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedInventory = async () => {
  try {
    // Get admin user for creating inventory items
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('Admin user not found. Please run the main seed script first.');
      return;
    }

    // Check if inventory already exists
    const existingInventory = await Inventory.countDocuments();
    if (existingInventory > 0) {
      console.log('Inventory already exists, skipping inventory creation');
      return;
    }

    const sampleInventory = [
      // Cars
      {
        name: 'Toyota Camry 2023',
        type: 'car',
        category: 'Sedan',
        subcategory: 'Mid-size',
        brand: 'Toyota',
        model: 'Camry',
        year: 2023,
        color: 'Silver',
        interiorColor: 'Black',
        sku: 'CAR-TOYOTA-CAMRY-2023-001',
        description: '2023 Toyota Camry SE Sedan with excellent fuel economy and reliability',
        costPrice: 25000,
        sellingPrice: 28000,
        quantity: 5,
        inStock: true,
        condition: 'new',
        status: 'active',
        vinNumber: [
          {
            status: 'active',
            chasisNumber: '1HGBH41JXMN109186'
          },
          {
            status: 'active',
            chasisNumber: '1HGBH41JXMN109187'
          },
          {
            status: 'active',
            chasisNumber: '1HGBH41JXMN109188'
          },
          {
            status: 'active',
            chasisNumber: '1HGBH41JXMN109189'
          },
          {
            status: 'active',
            chasisNumber: '1HGBH41JXMN109190'
          }
        ],
        dimensions: {
          length: 192.1,
          width: 72.4,
          height: 56.9,
          weight: 3310
        },
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Honda Civic 2023',
        type: 'car',
        category: 'Sedan',
        subcategory: 'Compact',
        brand: 'Honda',
        model: 'Civic',
        year: 2023,
        color: 'White',
        interiorColor: 'Gray',
        sku: 'CAR-HONDA-CIVIC-2023-001',
        description: '2023 Honda Civic Sport with modern design and advanced features',
        costPrice: 23000,
        sellingPrice: 26000,
        quantity: 3,
        inStock: true,
        condition: 'new',
        status: 'active',
        vinNumber: [
          {
            status: 'active',
            chasisNumber: '2HGBH41JXMN109188'
          },
          {
            status: 'active',
            chasisNumber: '2HGBH41JXMN109189'
          },
          {
            status: 'active',
            chasisNumber: '2HGBH41JXMN109190'
          }
        ],
        dimensions: {
          length: 184.0,
          width: 70.9,
          height: 55.7,
          weight: 2987
        },
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Ford F-150 2023',
        type: 'car',
        category: 'Truck',
        subcategory: 'Full-size',
        brand: 'Ford',
        model: 'F-150',
        year: 2023,
        color: 'Black',
        interiorColor: 'Brown',
        sku: 'CAR-FORD-F150-2023-001',
        description: '2023 Ford F-150 XLT with powerful engine and towing capacity',
        costPrice: 45000,
        sellingPrice: 52000,
        quantity: 2,
        inStock: true,
        condition: 'new',
        status: 'active',
        vinNumber: [
          {
            status: 'active',
            chasisNumber: '3FGBH41JXMN109189'
          },
          {
            status: 'active',
            chasisNumber: '3FGBH41JXMN109190'
          }
        ],
        dimensions: {
          length: 232.9,
          width: 79.9,
          height: 77.2,
          weight: 4069
        },
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'BMW X5 2023',
        type: 'car',
        category: 'SUV',
        subcategory: 'Luxury',
        brand: 'BMW',
        model: 'X5',
        year: 2023,
        color: 'Blue',
        interiorColor: 'Cream',
        sku: 'CAR-BMW-X5-2023-001',
        description: '2023 BMW X5 xDrive40i with luxury features and performance',
        costPrice: 65000,
        sellingPrice: 75000,
        quantity: 1,
        inStock: true,
        condition: 'new',
        status: 'active',
        vinNumber: [
          {
            status: 'active',
            chasisNumber: '4FGBH41JXMN109190'
          }
        ],
        dimensions: {
          length: 194.3,
          width: 78.9,
          height: 69.0,
          weight: 4856
        },
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Tesla Model 3 2024',
        type: 'car',
        category: 'Electric',
        subcategory: 'Sedan',
        brand: 'Tesla',
        model: 'Model 3',
        year: 2024,
        color: 'Red',
        interiorColor: 'White',
        sku: 'CAR-TESLA-MODEL3-2024-001',
        description: '2024 Tesla Model 3 with autopilot and long range',
        costPrice: 35000,
        sellingPrice: 42000,
        quantity: 3,
        inStock: true,
        condition: 'new',
        status: 'active',
        vinNumber: [
          {
            status: 'active',
            chasisNumber: '5FGBH41JXMN109191'
          },
          {
            status: 'active',
            chasisNumber: '5FGBH41JXMN109192'
          },
          {
            status: 'active',
            chasisNumber: '5FGBH41JXMN109193'
          }
        ],
        dimensions: {
          length: 184.8,
          width: 72.8,
          height: 56.8,
          weight: 1844
        },
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Honda Accord 2024',
        type: 'car',
        category: 'Sedan',
        subcategory: 'Mid-size',
        brand: 'Honda',
        model: 'Accord',
        year: 2024,
        color: 'Red',
        interiorColor: 'Black',
        sku: 'CAR-HONDA-ACCORD-2024-001',
        description: '2024 Honda Accord Sport with hybrid powertrain',
        costPrice: 28000,
        sellingPrice: 32000,
        quantity: 4,
        inStock: true,
        condition: 'new',
        status: 'active',
        vinNumber: [
          {
            status: 'active',
            chasisNumber: '6FGBH41JXMN109192'
          },
          {
            status: 'active',
            chasisNumber: '6FGBH41JXMN109193'
          },
          {
            status: 'active',
            chasisNumber: '6FGBH41JXMN109194'
          },
          {
            status: 'active',
            chasisNumber: '6FGBH41JXMN109195'
          }
        ],
        dimensions: {
          length: 195.9,
          width: 73.3,
          height: 57.1,
          weight: 3150
        },
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }
    ];

    const createdInventory = await Inventory.insertMany(sampleInventory);
    console.log('Inventory created successfully:', createdInventory.length, 'items');
    
    // Log summary
    const carCount = createdInventory.filter(item => item.type === 'car').length;
    console.log(`Cars: ${carCount}`);
    
    return createdInventory;
  } catch (error) {
    console.error('Error creating inventory:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await seedInventory();
    console.log('Inventory seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Inventory seeding failed:', error);
    process.exit(1);
  }
};

main();