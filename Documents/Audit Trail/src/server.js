import http from 'http';
import app from './app.js';

// Load environment variables (assuming dotenv will be used)
// import dotenv from 'dotenv';
// dotenv.config();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🩺 Health-check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handling for containerized environments
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // Close database connections here
    process.exit(0);
  });
});
