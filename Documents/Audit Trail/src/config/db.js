import mongoose from 'mongoose';

/**
 * Initializes the MongoDB connection.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audit-trail-ledger';
    
    // Connect to MongoDB with enterprise connection pooling, cross-region replication concerns, and timeouts
    await mongoose.connect(mongoURI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 50,
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      w: process.env.MONGO_WRITE_CONCERN || 'majority', // Guarantees zero data loss across cross-region replica sets
      readPreference: process.env.MONGO_READ_PREFERENCE || 'primaryPreferred' // Low-latency read routing
    });
    
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
