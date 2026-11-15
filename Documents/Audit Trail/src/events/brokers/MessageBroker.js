import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';
import telemetryService from '../../utils/telemetry.js';

/**
 * Enterprise Message Broker Adapter
 * 
 * Provides decoupled, distributed message broker integration (RabbitMQ / AMQP)
 * with at-least-once delivery guarantees, Dead-Letter Queuing (DLQ),
 * W3C OpenTelemetry trace propagation, and graceful in-memory fallback.
 */
class EnterpriseMessageBroker extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.exchangeName = 'audit_trail_events';
    this.dlxExchangeName = 'audit_trail_dlx';
    this.dlqQueueName = 'audit_trail_events_dlq';
    this.subscribers = new Map(); // eventType -> [callbacks]
  }

  async initialize() {
    // If RabbitMQ is not explicitly enabled or configured, use resilient in-memory broker
    if (process.env.ENABLE_RABBITMQ !== 'true' && !process.env.RABBITMQ_URL) {
      logger.info('🐰 [MessageBroker] RabbitMQ not explicitly enabled (set ENABLE_RABBITMQ=true to connect). Operating with in-memory broker.');
      this.isConnected = false;
      return;
    }

    const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_RABBITMQ) {
      logger.info('🧪 [MessageBroker] Running in test mode. Using resilient in-memory broker fallback.');
      this.isConnected = false;
      return;
    }

    try {
      const amqp = await import('amqplib');
      const connectPromise = amqp.connect(rabbitMQUrl);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out (2000ms)')), 2000)
      );
      this.connection = await Promise.race([connectPromise, timeoutPromise]);
      this.channel = await this.connection.createConfirmChannel();

      // 1. Declare Main Topic Exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });

      // 2. Declare Dead-Letter Exchange & Queue
      await this.channel.assertExchange(this.dlxExchangeName, 'direct', { durable: true });
      await this.channel.assertQueue(this.dlqQueueName, { durable: true });
      await this.channel.bindQueue(this.dlqQueueName, this.dlxExchangeName, 'dead_letter');

      this.isConnected = true;
      logger.info(`🐰 [MessageBroker] Connected to Enterprise RabbitMQ at ${rabbitMQUrl}`);

      this.connection.on('error', (err) => {
        logger.error(`[MessageBroker Error] Connection error: ${err.message}`);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('⚠️ [MessageBroker] RabbitMQ connection closed. Falling back to in-memory bus.');
        this.isConnected = false;
      });

    } catch (err) {
      this.isConnected = false;
      logger.warn(`⚠️ [MessageBroker] Could not connect to RabbitMQ: ${err.message}. Operating in resilient fallback mode.`);
    }
  }

  /**
   * Publishes an event to the distributed message broker with OpenTelemetry trace context.
   * 
   * @param {String} eventType - e.g. 'ITEM_CREATED', 'STOCK_ADDED'
   * @param {Object} eventData - Domain event payload
   * @param {Object} [traceContext] - W3C trace context
   */
  async publish(eventType, eventData, traceContext = null) {
    const traceId = traceContext?.traceId || telemetryService.generateTraceId();
    const spanId = telemetryService.generateSpanId();
    const traceparent = `00-${traceId}-${spanId}-01`;

    const messagePayload = {
      eventType,
      eventData,
      metadata: {
        publishedAt: new Date().toISOString(),
        producer: 'audit-trail-core-service',
        traceparent
      }
    };

    if (this.isConnected && this.channel) {
      try {
        const buffer = Buffer.from(JSON.stringify(messagePayload));
        const routingKey = `inventory.${eventType.toLowerCase()}`;

        return new Promise((resolve, reject) => {
          this.channel.publish(
            this.exchangeName,
            routingKey,
            buffer,
            {
              persistent: true, // Guarantees message is written to disk for at-least-once delivery
              headers: { traceparent, eventType, aggregateId: eventData.aggregateId }
            },
            (err) => {
              if (err) {
                logger.error(`❌ [MessageBroker] Publish failed for ${eventType}: ${err.message}`);
                reject(err);
              } else {
                logger.info(`📨 [MessageBroker] Dispatched ${eventType} [${eventData.aggregateId}] via RabbitMQ [Trace: ${traceId.substring(0, 8)}..]`);
                resolve(true);
              }
            }
          );
        });
      } catch (err) {
        logger.error(`[MessageBroker Publish Error] ${err.message}. Emitting locally.`);
      }
    }

    // Resilient Fallback: Emit to local event listeners
    logger.debug(`[MessageBroker (Local Fallback)] Emitting ${eventType} for ${eventData.aggregateId}`);
    this.emit(eventType, eventData);
    return true;
  }

  /**
   * Subscribes a consumer/projector to a specific event type.
   * 
   * @param {String} eventType
   * @param {Function} handlerFn
   */
  async subscribe(eventType, handlerFn) {
    // Register local in-memory handler
    this.on(eventType, handlerFn);

    if (this.isConnected && this.channel) {
      try {
        const queueName = `projector_${eventType.toLowerCase()}_queue`;
        const routingKey = `inventory.${eventType.toLowerCase()}`;

        // Declare durable queue with Dead-Letter Exchange (DLX) routing on reject
        await this.channel.assertQueue(queueName, {
          durable: true,
          deadLetterExchange: this.dlxExchangeName,
          deadLetterRoutingKey: 'dead_letter'
        });

        await this.channel.bindQueue(queueName, this.exchangeName, routingKey);

        // Consume with manual acknowledgment (At-Least-Once Delivery)
        this.channel.consume(queueName, async (msg) => {
          if (!msg) return;

          try {
            const parsed = JSON.parse(msg.content.toString());
            const traceContext = parsed.metadata?.traceparent
              ? telemetryService.extractOrInitTraceContext({ headers: { traceparent: parsed.metadata.traceparent } })
              : null;

            await telemetryService.withSpan(`Projector:${eventType}`, traceContext, async () => {
              await handlerFn(parsed.eventData);
            });

            this.channel.ack(msg); // Successfully processed
          } catch (err) {
            logger.error(`❌ [MessageBroker] Consumer error on ${eventType}: ${err.message}. Routing to DLQ.`);
            // Reject and route to Dead-Letter Queue without requeue
            this.channel.nack(msg, false, false);
          }
        });

        logger.info(`🎧 [MessageBroker] Subscribed consumer queue '${queueName}' to routing key '${routingKey}'`);
      } catch (err) {
        logger.warn(`[MessageBroker Subscribe Error] ${err.message}`);
      }
    }
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.isConnected = false;
  }
}

export default new EnterpriseMessageBroker();
