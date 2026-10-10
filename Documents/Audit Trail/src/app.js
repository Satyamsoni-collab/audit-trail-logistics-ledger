import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import CQRS Routes
import commandRoutes from './api/routes/command.routes.js';
import queryRoutes from './api/routes/query.routes.js';
import auditRoutes from './api/routes/audit.routes.js';
import { errorHandler, notFoundHandler } from './api/middlewares/errorHandler.middleware.js';

import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import logger from './utils/logger.js';

// Initialize Projectors
import './events/projectors/InventoryProjector.js';

const app = express();

// --- Middleware ---

// HTTP Request Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Security Headers
app.use(helmet());

// Rate Limiting to prevent brute-force/DDoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS Middleware
app.use(cors());

// Body Parsing Middleware
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload DOS

// Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());


// --- Routes ---

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Audit Trail Ledger API is healthy.'
  });
});

// CQRS Routing Architecture
// ----------------------------------------------------
// All write operations (Commands) are routed here
// Following append-only Event Sourcing, these endpoints will 
// validate commands and append events to the Event Store.
app.use('/api/commands', commandRoutes);

// All read operations (Queries) are routed here
// These endpoints will query the read models/projections.
app.use('/api/queries', queryRoutes);
app.use('/api/v1', auditRoutes);
// ----------------------------------------------------


// --- Error Handling ---

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Global Error Handler (Must be the last middleware)
app.use(errorHandler);

export default app;
