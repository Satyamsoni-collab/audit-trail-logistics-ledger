import { jest } from '@jest/globals';
import EventStoreService from '../../src/services/EventStoreService.js';
import Event from '../../src/models/events/EventStore.js';

describe('EventStoreService Unit Tests', () => {
  beforeEach(async () => {
    // Clear the collection before each test
    await Event.deleteMany({});
  });

  it('should successfully append an event with version 1', async () => {
    const eventData = {
      aggregateId: 'item-123',
      aggregateType: 'InventoryItem',
      eventType: 'ITEM_CREATED',
      payload: { name: 'Test Item' },
      expectedVersion: 0,
      actor: 'test-runner'
    };

    const savedEvent = await EventStoreService.appendEvent(eventData);

    expect(savedEvent).toBeDefined();
    expect(savedEvent.aggregateId).toBe('item-123');
    expect(savedEvent.version).toBe(1);
    expect(savedEvent.eventType).toBe('ITEM_CREATED');
  });

  it('should throw ConcurrencyException if appending with stale expectedVersion', async () => {
    const eventData = {
      aggregateId: 'item-456',
      aggregateType: 'InventoryItem',
      eventType: 'ITEM_CREATED',
      payload: { name: 'Test Item 2' },
      expectedVersion: 0
    };

    // Append first time successfully (version becomes 1)
    await EventStoreService.appendEvent(eventData);

    // Try to append again with expectedVersion still 0
    const conflictingEventData = {
      ...eventData,
      eventType: 'STOCK_ADDED',
      payload: { quantityChange: 10 }
    };

    await expect(EventStoreService.appendEvent(conflictingEventData))
      .rejects.toThrow(/ConcurrencyException/);
  });
});
