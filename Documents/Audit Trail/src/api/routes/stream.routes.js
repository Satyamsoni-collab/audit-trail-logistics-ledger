import { Router } from 'express';
import eventStreamService from '../../services/streaming/EventStreamService.js';
import logger from '../../utils/logger.js';

const router = Router();

/**
 * @route GET /api/v1/events/stream
 * @desc Server-Sent Events (SSE) endpoint for real-time logistics and ledger streaming
 * @query {String} [aggregateId] Optional filter for a specific shipment/item ID (e.g. SHP-10024)
 */
router.get('/stream', (req, res) => {
  const { aggregateId } = req.query;
  eventStreamService.registerClient(req, res, aggregateId);
});

/**
 * @route POST /api/v1/events/simulate
 * @desc Simulates publishing a logistics or transit event to test live stream reactivity
 */
router.post('/simulate', (req, res) => {
  try {
    const {
      eventType = 'TRANSIT_UPDATE',
      aggregateId = 'SHP-10024',
      status = 'IN TRANSIT',
      location = 'Bhiwandi Hub, Maharashtra',
      actor = 'dispatcher-agent-07',
      notes = 'Live simulated transit checkpoint via Day 25 stream'
    } = req.body || {};

    const eventData = {
      aggregateId,
      eventType,
      version: Date.now(),
      timestamp: new Date().toISOString(),
      actor,
      hash: 'sha256_live_' + Math.random().toString(16).slice(2, 10),
      payload: {
        shipmentId: aggregateId,
        status,
        location,
        notes,
        updatedAt: new Date().toISOString()
      }
    };

    eventStreamService.publishEvent(eventType, eventData);

    res.status(200).json({
      status: 'success',
      message: `Simulated event ${eventType} published to message broker and SSE stream.`,
      activeListeners: eventStreamService.getActiveClientCount(),
      event: eventData
    });
  } catch (err) {
    logger.error(`[EventStream Route Error] ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * @route GET /api/v1/events/status
 * @desc Get status of the event streaming service and active connected clients
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ACTIVE',
    protocol: 'Server-Sent Events (SSE)',
    activeClientsCount: eventStreamService.getActiveClientCount(),
    timestamp: new Date().toISOString()
  });
});

export default router;
