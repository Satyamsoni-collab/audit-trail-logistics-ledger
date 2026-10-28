import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import CQRS Routes
import commandRoutes from './api/routes/command.routes.js';
import queryRoutes from './api/routes/query.routes.js';
import auditRoutes from './api/routes/audit.routes.js';
import complianceRoutes from './api/routes/compliance.routes.js';
import aiRoutes from './api/routes/ai.routes.js';
import streamRoutes from './api/routes/stream.routes.js';
import { errorHandler, notFoundHandler } from './api/middlewares/errorHandler.middleware.js';

import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import logger from './utils/logger.js';
import telemetryService from './utils/telemetry.js';
import AutonomousRemediationAgent from './services/ai/AutonomousRemediationAgent.js';

// Initialize Projectors & Real-Time Monitoring Engines
import './events/projectors/InventoryProjector.js';
import './events/projectors/RealTimeAnalyticsProjector.js';
import './events/projectors/AnomalyDetectionEngine.js';

const app = express();

// --- OpenTelemetry Distributed Tracing Middleware ---
app.use(telemetryService.httpTracingMiddleware());

// --- Autonomous Circuit Breaker Middleware ---
app.use((req, res, next) => {
  if (AutonomousRemediationAgent.isCircuitOpen() && req.path.startsWith('/api/commands')) {
    return res.status(503).json({
      status: 'error',
      code: 'CIRCUIT_BREAKER_OPEN',
      message: 'Service Temporarily Unavailable: Circuit breaker tripped by Autonomous Remediation Agent.'
    });
  }
  next();
});

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
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/events', streamRoutes);
app.use('/api/events', streamRoutes);

// Prometheus Metrics Scraper Endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(telemetryService.getPrometheusMetrics());
});
// ----------------------------------------------------


// --- Error Handling ---

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Global Error Handler (Must be the last middleware)
app.use(errorHandler);

export default app;
