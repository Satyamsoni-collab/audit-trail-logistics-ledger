import mongoose from 'mongoose';

beforeAll(async () => {
  // Connect to a local test database with graceful fallback timeout
  const mongoURI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/audit-trail-test';
  try {
    const connectPromise = mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('MongoDB connection timeout')), 2500)
    );
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (err) {
    console.warn('⚠️ [Test Setup] MongoDB unavailable, continuing in offline/mock mode:', err.message);
  }
});

afterAll(async () => {
  // Drop database and close connection to keep it clean
  if (mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    } catch (e) {
      // Ignore cleanup error
    }
  }
});
