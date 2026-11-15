
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env file
dotenv.config({
  path: path.resolve(__dirname, '../../../.env')
});

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_TEST_URI;

  if (!mongoURI) {
    throw new Error(
      'MONGODB_TEST_URI is missing in the root .env file.'
    );
  }

  if (mongoURI === process.env.MONGODB_URI) {
    throw new Error(
      'Safety check failed: test URI must not equal production URI.'
    );
  }

  await mongoose.connect(mongoURI);
  console.log('Connected to MongoDB test database.');
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});
