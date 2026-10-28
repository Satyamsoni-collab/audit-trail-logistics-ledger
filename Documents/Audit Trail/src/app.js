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
import authRoutes from './api/routes/auth.routes.js';
import { commandRateLimiter, queryRateLimiter, authRateLimiter } from './api/middlewares/rateLimiter.middleware.js';
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

// --- Day 27: API Hardening & Security Middleware ---

// 1. Production-Grade Helmet Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'ws:',
        'wss:'
      ]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // Clickjacking protection
  },
  noSniff: true,
  xssFilter: true
}));

// 2. Strict CORS Configuration for React Frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, internal microservices) or whitelisted frontend
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Policy Violation: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-id',
    'x-user-role',
    'x-clearance-level',
    'traceparent',
    'Accept'
  ]
}));

// 3. Request Payload Size Limits (Buffer Overflow / DOS Prevention)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Data Sanitization against NoSQL Query Injection & Prototype Pollution
app.use(mongoSanitize());
app.use((req, res, next) => {
  // Prototype pollution filter
  const isMalicious = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return true;
      if (typeof obj[key] === 'object' && isMalicious(obj[key])) return true;
    }
    return false;
  };

  if (isMalicious(req.body) || isMalicious(req.query)) {
    logger.warn(`🚨 [Security] Blocked prototype pollution attempt from IP: ${req.ip}`);
    return res.status(400).json({
      status: 'error',
      code: 'MALFORMED_PAYLOAD',
      message: 'Suspicious payload detected: Reserved prototype keys are prohibited.'
    });
  }
  next();
});


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
// Authentication & RBAC Routes (Day 27)
app.use('/api/v1/auth', authRateLimiter, authRoutes);

// All write operations (Commands) are protected with rate limiting & RBAC
app.use('/api/commands', commandRateLimiter, commandRoutes);

// All read operations (Queries) are routed here
app.use('/api/queries', queryRateLimiter, queryRoutes);
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
