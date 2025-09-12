const mongoose = require('mongoose');
require('dotenv').config();

// Import the Quotation model
const Quotation = require('../models/quotation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanupQuotations = async () => {
  try {
    console.log('Starting quotation cleanup...');
    
    // Find documents with null quotationNumber
    const nullQuotationNumbers = await Quotation.find({ quotationNumber: null });
    console.log(`Found ${nullQuotationNumbers.length} documents with null quotationNumber`);
    
    if (nullQuotationNumbers.length > 0) {
      // Delete documents with null quotationNumber
      const deleteResult = await Quotation.deleteMany({ quotationNumber: null });
      console.log(`Deleted ${deleteResult.deletedCount} documents with null quotationNumber`);
    }
    
    // Find documents with null quotationId
    const nullQuotationIds = await Quotation.find({ quotationId: null });
    console.log(`Found ${nullQuotationIds.length} documents with null quotationId`);
    
    if (nullQuotationIds.length > 0) {
      // Delete documents with null quotationId
      const deleteResult = await Quotation.deleteMany({ quotationId: null });
      console.log(`Deleted ${deleteResult.deletedCount} documents with null quotationId`);
    }
    
    console.log('Quotation cleanup completed successfully');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the cleanup
connectDB().then(() => {
  cleanupQuotations();
});
