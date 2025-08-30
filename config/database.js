const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if(process.env.NODE_ENV === 'production') {
      const conn = await mongoose.connect(process.env.MONGODB_URI_PRODUCTION, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`MongoDB Connected: ${conn.connection.host} to connection string ${conn.connection.name}`);

    } else {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`MongoDB Connected: ${conn.connection.host} to connection string ${conn.connection.name}`);

    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    console.error('Connection details:', {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.NODE_ENV === 'production' 
        ? process.env.MONGODB_URI_PRODUCTION?.substring(0, 50) + '...' 
        : process.env.MONGODB_URI?.substring(0, 50) + '...',
      errorCode: error.code,
      errorName: error.name
    });
    process.exit(1);
  }
};

module.exports = connectDB;
