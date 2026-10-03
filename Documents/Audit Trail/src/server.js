import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

// Load environment variables early
dotenv.config();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Connect to Database, then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`🩺 Health-check: http://localhost:${PORT}/api/health`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to database. Server not started.', err);
  process.exit(1);
});

// --- Graceful Shutdown Handling for Production ---

const shutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} signal received: closing HTTP server and database connection`);
  
  server.close(async () => {
    console.log('✅ HTTP server closed');
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed.');
      }
      process.exit(0);
    } catch (err) {
      console.error('❌ Error while closing database connection:', err);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled Promise rejections and uncaught exceptions globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception thrown:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});
