import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // In production with high throughput, you might want to increase this
    this.setMaxListeners(20);
  }

  publish(eventType, eventData) {
    console.log(`[EventBus] Publishing event: ${eventType} for aggregate: ${eventData.aggregateId}`);
    this.emit(eventType, eventData);
  }

  subscribe(eventType, callback) {
    this.on(eventType, callback);
  }
}

// Export a singleton instance so all modules share the same bus
export default new EventBus();
