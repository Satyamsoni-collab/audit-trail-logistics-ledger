require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");

const testConnection = async () => {
  await connectDB();

  console.log("MongoDB connection test successful");

  await mongoose.connection.close();
  console.log("MongoDB connection closed");
};

testConnection();
