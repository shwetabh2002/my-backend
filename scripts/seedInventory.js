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
        brand: 'Toyota',
        sku: 'CAR-TOY-001',
        description: '2023 Toyota Camry SE Sedan with excellent fuel economy and reliability',
        costPrice: 25000,
        sellingPrice: 28000,
        quantity: 5,
        inStock: true,
        location: 'Main Showroom',
        condition: 'new',
        status: 'active',
        model: 'Camry',
        year: 2023,
        color: 'Silver',
        images: [
          {
            url: 'https://example.com/images/camry-front.jpg',
            alt: 'Toyota Camry Front View',
            caption: 'Front view of the 2023 Toyota Camry SE',
            isPrimary: true
          },
          {
            url: 'https://example.com/images/camry-side.jpg',
            alt: 'Toyota Camry Side View',
            caption: 'Side profile of the 2023 Toyota Camry SE',
            isPrimary: false
          }
        ],
        dimensions: {
          length: 192.1,
          width: 72.4,
          height: 56.9,
          weight: 3310
        },
        tags: ['sedan', 'fuel-efficient', 'reliable', 'family-car'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Honda Civic 2023',
        type: 'car',
        category: 'Sedan',
        brand: 'Honda',
        sku: 'CAR-HON-001',
        description: '2023 Honda Civic Sport with modern design and advanced features',
        costPrice: 23000,
        sellingPrice: 26000,
        quantity: 3,
        inStock: true,
        location: 'Main Showroom',
        condition: 'new',
        status: 'active',
        model: 'Civic',
        year: 2023,
        color: 'White',
        images: [
          {
            url: 'https://example.com/images/civic-front.jpg',
            alt: 'Honda Civic Front View',
            caption: 'Front view of the 2023 Honda Civic Sport',
            isPrimary: true
          },
          {
            url: 'https://example.com/images/civic-interior.jpg',
            alt: 'Honda Civic Interior',
            caption: 'Interior view of the 2023 Honda Civic Sport',
            isPrimary: false
          }
        ],
        dimensions: {
          length: 184.0,
          width: 70.9,
          height: 55.7,
          weight: 2987
        },
        tags: ['sedan', 'sport', 'modern', 'efficient'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Ford F-150 2023',
        type: 'car',
        category: 'Truck',
        brand: 'Ford',
        sku: 'CAR-FOR-001',
        description: '2023 Ford F-150 XLT with powerful engine and towing capacity',
        costPrice: 45000,
        sellingPrice: 52000,
        quantity: 2,
        inStock: true,
        location: 'Truck Section',
        condition: 'new',
        status: 'active',
        model: 'F-150',
        year: 2023,
        color: 'Black',
        images: [
          {
            url: 'https://example.com/images/f150-front.jpg',
            alt: 'Ford F-150 Front View',
            caption: 'Front view of the 2023 Ford F-150 XLT',
            isPrimary: true
          },
          {
            url: 'https://example.com/images/f150-bed.jpg',
            alt: 'Ford F-150 Bed View',
            caption: 'Bed view of the 2023 Ford F-150 XLT',
            isPrimary: false
          }
        ],
        dimensions: {
          length: 232.9,
          width: 79.9,
          height: 77.2,
          weight: 4069
        },
        tags: ['truck', 'powerful', 'towing', 'work-vehicle'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'BMW X5 2023',
        type: 'car',
        category: 'SUV',
        brand: 'BMW',
        sku: 'CAR-BMW-001',
        description: '2023 BMW X5 xDrive40i with luxury features and performance',
        costPrice: 65000,
        sellingPrice: 75000,
        quantity: 1,
        inStock: true,
        location: 'Luxury Section',
        condition: 'new',
        status: 'active',
        model: 'X5',
        year: 2023,
        color: 'Blue',
        images: [
          {
            url: 'https://example.com/images/x5-front.jpg',
            alt: 'BMW X5 Front View',
            caption: 'Front view of the 2023 BMW X5 xDrive40i',
            isPrimary: true
          },
          {
            url: 'https://example.com/images/x5-interior.jpg',
            alt: 'BMW X5 Interior',
            caption: 'Luxury interior of the 2023 BMW X5 xDrive40i',
            isPrimary: false
          }
        ],
        dimensions: {
          length: 194.3,
          width: 78.9,
          height: 69.0,
          weight: 4856
        },
        tags: ['suv', 'luxury', 'performance', 'premium'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Tesla Model 3 2024',
        type: 'car',
        color: 'Red',
        category: 'Electric',
        brand: 'Tesla',
        sku: 'CAR-TES-001',
        description: '2024 Tesla Model 3 with autopilot and long range',
        costPrice: 35000,
        sellingPrice: 42000,
        quantity: 3,
        inStock: true,
        location: 'Electric Showroom',
        condition: 'new',
        status: 'active',
        model: 'Model 3',
        year: 2024,
        images: [
          {
            url: 'https://example.com/images/tesla-front.jpg',
            alt: 'Tesla Model 3 Front View',
            caption: 'Front view of the 2024 Tesla Model 3',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 184.8,
          width: 72.8,
          height: 56.8,
          weight: 1844
        },
        tags: ['electric', 'autopilot', 'luxury', 'sustainable'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        color: 'Red',
        name: 'Honda Accord 2024',
        type: 'car',
        category: 'Sedan',
        brand: 'Honda',
        sku: 'CAR-HON-002',
        description: '2024 Honda Accord Sport with hybrid powertrain',
        costPrice: 28000,
        sellingPrice: 32000,
        quantity: 4,
        inStock: true,
        location: 'Main Showroom',
        condition: 'new',
        status: 'active',
        model: 'Accord',
        year: 2024,
        images: [
          {
            url: 'https://example.com/images/accord-front.jpg',
            alt: 'Honda Accord Front View',
            caption: 'Front view of the 2024 Honda Accord Sport',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 195.9,
          width: 73.3,
          height: 57.1,
          weight: 3150
        },
        tags: ['sedan', 'hybrid', 'efficient', 'family-car'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },

      // Car Parts
      {
        name: 'Oil Filter - Toyota Compatible',
        type: 'part',
        category: 'Filters',
        brand: 'Toyota Genuine',
        sku: 'PART-FIL-001',
        description: 'High-quality oil filter compatible with Toyota engines',
        costPrice: 8.50,
        sellingPrice: 12.99,
        quantity: 50,
        inStock: true,
        location: 'Parts Warehouse A',
        condition: 'new',
        status: 'active',
        color: 'Red',
        images: [
          {
            url: 'https://example.com/images/oil-filter.jpg',
            alt: 'Toyota Oil Filter',
            caption: 'High-quality oil filter for Toyota engines',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 3.5,
          width: 3.5,
          height: 2.8,
          weight: 0.3
        },
        tags: ['filter', 'oil', 'toyota', 'maintenance'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        color: 'Red',
        name: 'Brake Pads - Front Set',
        type: 'part',
        category: 'Brakes',
        brand: 'Brembo',
        sku: 'PART-BRA-001',
        description: 'Premium brake pads for front wheels, fits most sedans',
        costPrice: 45.00,
        sellingPrice: 89.99,
        quantity: 25,
        inStock: true,
        location: 'Parts Warehouse A',
        condition: 'new',
        status: 'active',
        color: 'Red',
        images: [
          {
            url: 'https://example.com/images/brake-pads.jpg',
            alt: 'Brembo Brake Pads',
            caption: 'Premium brake pads for front wheels',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 6.0,
          width: 2.5,
          height: 0.8,
          weight: 1.2
        },
        tags: ['brakes', 'pads', 'front', 'premium'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Air Filter - Universal',
        type: 'part',
        category: 'Filters',
        brand: 'K&N',
        sku: 'PART-FIL-002',
        description: 'High-performance air filter for improved engine breathing',
        costPrice: 35.00,
        sellingPrice: 69.99,
        quantity: 30,
        inStock: true,
        location: 'Parts Warehouse B',
        condition: 'new',
        status: 'active',
        color: 'Red',
        images: [
          {
            url: 'https://example.com/images/air-filter.jpg',
            alt: 'K&N Air Filter',
            caption: 'High-performance air filter for improved engine breathing',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 8.0,
          width: 6.0,
          height: 2.0,
          weight: 0.8
        },
        tags: ['filter', 'air', 'performance', 'universal'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Spark Plugs - Iridium Set',
        type: 'part',
        category: 'Ignition',
        brand: 'NGK',
        sku: 'PART-IGN-001',
        description: 'Iridium spark plugs for better ignition and fuel efficiency',
        costPrice: 12.00,
        sellingPrice: 24.99,
        quantity: 100,
        inStock: true,
        location: 'Parts Warehouse B',
        condition: 'new',
        status: 'active',
        color: 'Red',
        images: [
          {
            url: 'https://example.com/images/spark-plugs.jpg',
            alt: 'NGK Iridium Spark Plugs',
            caption: 'Iridium spark plugs for better ignition and fuel efficiency',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 2.5,
          width: 0.5,
          height: 0.5,
          weight: 0.1
        },
        tags: ['spark-plugs', 'iridium', 'ignition', 'efficiency'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      },
      {
        name: 'Windshield Wiper Blades',
        type: 'part',
        category: 'Exterior',
        brand: 'Bosch',
        sku: 'PART-EXT-001',
        description: 'Premium windshield wiper blades for all weather conditions',
        costPrice: 15.00,
        sellingPrice: 29.99,
        quantity: 75,
        inStock: true,
        location: 'Parts Warehouse B',
        condition: 'new',
        status: 'active',
        color: 'Red',
        images: [
          {
            url: 'https://example.com/images/wiper-blades.jpg',
            alt: 'Bosch Wiper Blades',
            caption: 'Premium windshield wiper blades for all weather conditions',
            isPrimary: true
          }
        ],
        dimensions: {
          length: 18.0,
          width: 1.0,
          height: 0.5,
          weight: 0.4
        },
        tags: ['wipers', 'windshield', 'exterior', 'weather'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }
    ];

    const createdInventory = await Inventory.insertMany(sampleInventory);
    console.log('Inventory created successfully:', createdInventory.length, 'items');
    
    // Log summary
    const carCount = createdInventory.filter(item => item.type === 'car').length;
    const partCount = createdInventory.filter(item => item.type === 'part').length;
    console.log(`Cars: ${carCount}, Parts: ${partCount}`);
    
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
