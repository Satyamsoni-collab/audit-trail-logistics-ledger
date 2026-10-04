import mongoose from 'mongoose';

beforeAll(async () => {
  // Connect to a local test database
  const mongoURI = 'mongodb://localhost:27017/audit-trail-test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  // Drop database and close connection to keep it clean
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});
