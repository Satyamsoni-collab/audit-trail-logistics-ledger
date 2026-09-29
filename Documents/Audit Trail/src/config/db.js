import mongoose from 'mongoose';

/**
 * Initializes the MongoDB connection.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audit-trail-ledger';
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    
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
