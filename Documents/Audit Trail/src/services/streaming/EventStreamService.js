import { EventEmitter } from 'events';
import EventBus from '../../events/EventBus.js';
import messageBroker from '../../events/brokers/MessageBroker.js';
import logger from '../../utils/logger.js';

/**
 * EventStreamService
 * 
 * Provides Server-Sent Events (SSE) streaming infrastructure for live logistics updates.
 * Subscribes to the Enterprise Message Broker and EventBus to broadcast domain events
 * directly to connected web clients with heartbeat keepalive and aggregate-level filtering.
 */
class EventStreamService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set(); // Set<{ id: string, res: Response, aggregateId?: string, connectedAt: Date }>
    this.heartbeatInterval = null;

    this.init();
  }

  init() {
    // Start periodic SSE heartbeat (every 20s) to keep connections alive through proxies and firewalls
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 20000);

    // Unref interval so it does not block process exit
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }

    // Subscribe to all primary domain events via MessageBroker / EventBus
    const domainEvents = [
      'ITEM_CREATED',
      'STOCK_ADDED',
      'STOCK_REMOVED',
      'SHIPMENT_CREATED',
      'SHIPMENT_DISPATCHED',
      'IN_TRANSIT',
      'TRANSIT_UPDATE',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'SHIPMENT_EXCEPTION',
      'AUDIT_RECORD_APPENDED'
    ];

    for (const evt of domainEvents) {
      messageBroker.on(evt, (eventData) => {
        this.broadcast(evt, eventData);
      });
    }

    logger.info('📡 [EventStreamService] Real-time event streaming service initialized with SSE.');
  }

  /**
   * Registers a new SSE client connection.
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {String} [aggregateId] - Optional aggregate ID filter (e.g. SHP-10024)
   * @returns {Object} Connection handle
   */
  registerClient(req, res, aggregateId = null) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Set standard SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering for Nginx
      'Access-Control-Allow-Origin': '*'
    });

    const client = {
      id: clientId,
      res,
      aggregateId: aggregateId ? String(aggregateId).trim() : null,
      connectedAt: new Date()
    };

    this.clients.add(client);
    logger.info(`📡 [EventStreamService] Client connected: ${clientId} (Filter: ${client.aggregateId || 'ALL'}) | Total active: ${this.clients.size}`);

    // Send initial connected acknowledgement frame
    res.write(`event: connected\ndata: ${JSON.stringify({
      status: 'connected',
      clientId,
      filter: client.aggregateId || 'ALL',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Clean up when client disconnects
    req.on('close', () => {
      this.clients.delete(client);
      logger.info(`📡 [EventStreamService] Client disconnected: ${clientId} | Remaining: ${this.clients.size}`);
    });

    return client;
  }

  /**
   * Sends a comment heartbeat ping to all connected clients.
   */
  sendHeartbeat() {
    if (this.clients.size === 0) return;

    const pingFrame = `: heartbeat ${Date.now()}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(pingFrame);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Broadcasts a domain event to all eligible connected clients.
   * 
   * @param {String} eventType
   * @param {Object} eventData
   */
  broadcast(eventType, eventData) {
    if (this.clients.size === 0 || !eventData) return;

    const eventAggregateId = eventData.aggregateId || eventData.payload?.shipmentId || eventData.payload?.trackingNo;
    const ssePayload = JSON.stringify({
      eventType,
      aggregateId: eventAggregateId,
      version: eventData.version,
      hash: eventData.hash,
      previousHash: eventData.previousHash,
      timestamp: eventData.timestamp || new Date().toISOString(),
      actor: eventData.actor || 'system',
      payload: eventData.payload || {}
    });

    const frame = `event: message\ndata: ${ssePayload}\n\n`;

    let deliveryCount = 0;
    for (const client of this.clients) {
      // If client specified an aggregateId filter, only send if it matches
      if (client.aggregateId && eventAggregateId && client.aggregateId !== eventAggregateId) {
        continue;
      }

      try {
        client.res.write(frame);
        deliveryCount++;
      } catch (err) {
        this.clients.delete(client);
      }
    }

    if (deliveryCount > 0) {
      logger.debug(`📡 [EventStreamService] Streamed ${eventType} for ${eventAggregateId} to ${deliveryCount} client(s)`);
    }
  }

  /**
   * Manually emits an event to the local stream and message broker.
   * 
   * @param {String} eventType
   * @param {Object} eventData
   */
  publishEvent(eventType, eventData) {
    EventBus.publish(eventType, eventData);
    this.broadcast(eventType, eventData);
  }

  getActiveClientCount() {
    return this.clients.size;
  }
}

export default new EventStreamService();
