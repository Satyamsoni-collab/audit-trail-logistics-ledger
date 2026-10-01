import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import CQRS Routes
import commandRoutes from './api/routes/command.routes.js';
import queryRoutes from './api/routes/query.routes.js';
import auditRoutes from './api/routes/audit.routes.js';

// Initialize Projectors
import './events/projectors/InventoryProjector.js';

const app = express();

// --- Middleware ---

// Security Middleware
app.use(helmet());

// CORS Middleware
app.use(cors());

// Body Parsing Middleware
// Essential for processing incoming JSON payloads in Commands
app.use(express.json());


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
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
