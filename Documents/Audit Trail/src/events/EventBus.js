import messageBroker from './brokers/MessageBroker.js';
import logger from '../utils/logger.js';

/**
 * EventBus Facade
 * 
 * Decouples publishers and subscribers by delegating to the Enterprise Message Broker
 * (RabbitMQ/AMQP) with distributed at-least-once delivery, trace propagation,
 * and resilient local fallback.
 */
class EventBus {
  constructor() {
    this.broker = messageBroker;
    // Auto-initialize connection in background
    this.broker.initialize().catch((err) => {
      logger.warn(`[EventBus] Broker background init note: ${err.message}`);
    });
  }

  /**
   * Publishes a domain event across the message broker with trace context.
   * 
   * @param {String} eventType
   * @param {Object} eventData
   * @param {Object} [traceContext]
   */
  async publish(eventType, eventData, traceContext = null) {
    logger.debug(`[EventBus] Publishing ${eventType} for aggregate ${eventData.aggregateId}`);
    return this.broker.publish(eventType, eventData, traceContext);
  }

  /**
   * Subscribes a consumer/projector to a domain event.
   * 
   * @param {String} eventType
   * @param {Function} callback
   */
  subscribe(eventType, callback) {
    this.broker.subscribe(eventType, callback);
  }
}

export default new EventBus();
