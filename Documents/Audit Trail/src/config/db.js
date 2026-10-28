import mongoose from 'mongoose';

/**
 * Initializes the MongoDB connection.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/audit-trail-ledger';
    console.log(`⏳ Connecting to MongoDB at ${mongoURI}...`);
    
    const mongooseOpts = {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 50,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    if (process.env.MONGO_WRITE_CONCERN) {
      mongooseOpts.w = process.env.MONGO_WRITE_CONCERN;
    }
    if (process.env.MONGO_READ_PREFERENCE) {
      mongooseOpts.readPreference = process.env.MONGO_READ_PREFERENCE;
    }

    // Connect to MongoDB with enterprise connection pooling and timeouts
    await mongoose.connect(mongoURI, mongooseOpts);
    
    console.log(`📦 MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure if we cannot connect to the database
    process.exit(1);
  }
};

// Handle connection events for robustness
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB Error: ${err.message}`);
});

export default connectDB;
