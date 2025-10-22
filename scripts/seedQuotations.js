const mongoose = require('mongoose');
require('dotenv').config();

const Quotation = require('../models/quotation');
const User = require('../models/User');
const Inventory = require('../models/Inventory');

const connectDB = async () => {
  try {
    if(process.env.NODE_ENV === 'production') {
      await mongoose.connect(process.env.MONGODB_URI_PRODUCTION);
    } else {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('MongoDB connected for quotation seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedQuotations = async () => {
  try {
    // Get admin user for creating quotations
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('Admin user not found. Please run the main seed script first.');
      return;
    }

    // Get some inventory items
    const inventoryItems = await Inventory.find({ type: 'car' }).limit(3);
    const inventoryItemsWithSupplier = await Inventory.find({ type: 'car', supplierId: { $exists: true, $ne: null } }).limit(3);
    if (inventoryItems.length === 0) {
      console.log('No inventory items found. Please run inventory seed first.');
      return;
    }
    if (inventoryItemsWithSupplier.length < 2) {
      console.log('Not enough inventory items with suppliers found. Using regular inventory items instead.');
      // Use regular inventory items as fallback
      inventoryItemsWithSupplier.push(...inventoryItems.slice(0, 2 - inventoryItemsWithSupplier.length));
    }

    // Check if quotations already exist
    const existingQuotations = await Quotation.countDocuments();
    if (existingQuotations > 0) {
      console.log('Quotations already exist, skipping quotation creation');
      return;
    }

    // Generate quotation IDs
    const year = new Date().getFullYear();
    const quotationNumber1 = `QUO-${year}-000001`;
    const quotationId1 = `QID-${year}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    const quotationNumber2 = `QUO-${year}-000002`;
    const quotationId2 = `QID-${year}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

    const sampleQuotations = [
      {
        quotationId: quotationId1,
        quotationNumber: quotationNumber1,
        customer: {
          userId: adminUser._id, // Add required userId
          custId: 'CUS-001',
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '+1-555-0100',
          address: '123 Customer Street, Dubai, UAE',
          trn: 'TRN123456789'
        },
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'draft',
        statusHistory: [{
          status: 'draft',
          date: new Date()
        }],
        items: [
          {
            itemId: inventoryItems[0]._id,
            name: inventoryItems[0].name,
            type: inventoryItems[0].type,
            category: inventoryItems[0].category,
            subcategory: inventoryItems[0].subcategory,
            brand: inventoryItems[0].brand,
            model: inventoryItems[0].model,
            year: inventoryItems[0].year,
            color: inventoryItems[0].color,
            sku: inventoryItems[0].sku,
            description: inventoryItems[0].description,
            costPrice: inventoryItems[0].costPrice,
            sellingPrice: inventoryItems[0].sellingPrice,
            condition: inventoryItems[0].condition,
            status: inventoryItems[0].status,
            dimensions: inventoryItems[0].dimensions,
            quantity: 1,
            unitPrice: inventoryItems[0].sellingPrice,
            totalPrice: inventoryItems[0].sellingPrice,
            vinNumbers: [
              {
                status: 'hold',
                chasisNumber: inventoryItems[0].vinNumber[0].chasisNumber
              }
            ],
            interiorColor: inventoryItems[0].interiorColor
          }
        ],
        subtotal: inventoryItems[0].sellingPrice, // Add required subtotal
        totalDiscount: 0,
        VAT: 0,
        currency: 'AED',
        bankCurrency: 'AED',
        exchangeRate: 1,
        vatAmount: inventoryItems[0].sellingPrice * 0.05, // Add vatAmount
        totalAmount: inventoryItems[0].sellingPrice * 1.05, // Including 5% VAT
        bookingAmount: 0, // Add bookingAmount field
        notes: 'Sample quotation for testing purposes',
        exportTo: 'Dubai, UAE',
        deliveryAddress: '123 Customer Street, Dubai, UAE',
        createdBy: adminUser._id
      },
      {
        quotationId: quotationId2,
        quotationNumber: quotationNumber2,
        customer: {
          userId: adminUser._id, // Add required userId
          custId: 'CUS-002',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1-555-0200',
          address: '456 Business Avenue, Dubai, UAE',
          trn: 'TRN987654321'
        },
        validTill: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        status: 'draft',
        statusHistory: [{
          status: 'draft',
          date: new Date()
        }],
        items: [
          {
            itemId: inventoryItemsWithSupplier[1]?._id || inventoryItems[1]?._id,
            supplierId: inventoryItemsWithSupplier[1]?.supplierId || null,
            name: inventoryItemsWithSupplier[1]?.name || inventoryItems[1]?.name,
            type: inventoryItemsWithSupplier[1]?.type || inventoryItems[1]?.type,
            category: inventoryItemsWithSupplier[1]?.category || inventoryItems[1]?.category,
            subcategory: inventoryItemsWithSupplier[1]?.subcategory || inventoryItems[1]?.subcategory,
            brand: inventoryItemsWithSupplier[1]?.brand || inventoryItems[1]?.brand,
            model: inventoryItemsWithSupplier[1]?.model || inventoryItems[1]?.model,
            year: inventoryItemsWithSupplier[1]?.year || inventoryItems[1]?.year,
            color: inventoryItemsWithSupplier[1]?.color || inventoryItems[1]?.color,
            sku: inventoryItemsWithSupplier[1]?.sku || inventoryItems[1]?.sku,
            description: inventoryItemsWithSupplier[1]?.description || inventoryItems[1]?.description,
            costPrice: inventoryItemsWithSupplier[1]?.costPrice || inventoryItems[1]?.costPrice,
            sellingPrice: inventoryItemsWithSupplier[1]?.sellingPrice || inventoryItems[1]?.sellingPrice,
            condition: inventoryItemsWithSupplier[1]?.condition || inventoryItems[1]?.condition,
            status: inventoryItemsWithSupplier[1]?.status || inventoryItems[1]?.status,
            dimensions: inventoryItemsWithSupplier[1]?.dimensions || inventoryItems[1]?.dimensions,
            quantity: 2,
            unitPrice: inventoryItemsWithSupplier[1]?.sellingPrice || inventoryItems[1]?.sellingPrice,
            totalPrice: (inventoryItemsWithSupplier[1]?.sellingPrice || inventoryItems[1]?.sellingPrice) * 2,
            vinNumbers: [
              {
                status: 'hold',
                chasisNumber: inventoryItemsWithSupplier[1]?.vinNumber?.[0]?.chasisNumber || inventoryItems[1]?.vinNumber?.[0]?.chasisNumber
              },
              {
                status: 'hold',
                chasisNumber: inventoryItemsWithSupplier[1]?.vinNumber?.[1]?.chasisNumber || inventoryItems[1]?.vinNumber?.[1]?.chasisNumber
              }
            ],
            interiorColor: inventoryItemsWithSupplier[1]?.interiorColor || inventoryItems[1]?.interiorColor
          }
        ],
        statusHistory: [{
          status: 'draft',
          date: new Date()
        }],
        totalDiscount: 1000,
        VAT: 5,
        currency: 'AED',
        bankCurrency: 'AED',
        exchangeRate: 1,
        subtotal: (inventoryItemsWithSupplier[1]?.sellingPrice || inventoryItems[1]?.sellingPrice) * 2,
        vatAmount: ((inventoryItemsWithSupplier[1]?.sellingPrice || inventoryItems[1]?.sellingPrice) * 2 - 1000) * 0.05,
        totalAmount: ((inventoryItemsWithSupplier[1]?.sellingPrice || inventoryItems[1]?.sellingPrice) * 2 - 1000) * 1.05,
        bookingAmount: 0, // Add bookingAmount field
        notes: 'Bulk order with discount applied',
        exportTo: 'Abu Dhabi, UAE',
        deliveryAddress: '456 Business Avenue, Dubai, UAE',
        createdBy: adminUser._id
      }
    ];

    const createdQuotations = await Quotation.insertMany(sampleQuotations);
    console.log('Quotations created successfully:', createdQuotations.length, 'quotations');
    
    // Log summary
    const draftCount = createdQuotations.filter(q => q.status === 'draft').length;
    const reviewCount = createdQuotations.filter(q => q.status === 'review').length;
    console.log(`Draft: ${draftCount}, Review: ${reviewCount}`);
    
    return createdQuotations;
  } catch (error) {
    console.error('Error creating quotations:', error);
    throw error;
  }
};

const runSeed = async () => {
  try {
    await connectDB();
    
    console.log('Starting quotation seeding...');
    await seedQuotations();
    
    console.log('Quotation seeding completed successfully!');
    console.log('\n📝 Sample quotations created with:');
    console.log('- Customer details');
    console.log('- Inventory items with VIN numbers');
    console.log('- Proper calculations (subtotal, VAT, total)');
    console.log('- Different statuses (draft, sent)');
    
    process.exit(0);
  } catch (error) {
    console.error('Quotation seeding failed:', error);
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
