import EventStoreService from '../services/EventStoreService.js';

/**
 * Command Handler for Updating Stock (adding or removing).
 */
class UpdateStockHandler {
  /**
   * Executes the UpdateStock command.
   * 
   * @param {Object} commandData
   * @param {String} commandData.aggregateId
   * @param {Number} commandData.quantityChange (positive to add, negative to remove)
   * @param {String} commandData.reason
   * @param {Number} commandData.expectedVersion
   * @param {String} [commandData.actor]
   */
  static async handle(commandData) {
    // 1. Validate Command
    if (!commandData.aggregateId) {
      throw new Error('ValidationException: aggregateId is required.');
    }
    if (typeof commandData.quantityChange !== 'number' || commandData.quantityChange === 0) {
      throw new Error('ValidationException: quantityChange must be a non-zero number.');
    }
    if (commandData.expectedVersion === undefined) {
      throw new Error('ValidationException: expectedVersion is required for concurrency control.');
    }

    // 2. (Optional) In a strict event-sourced system, to validate business rules 
    // like "cannot reduce stock below 0", we would first rebuild the aggregate 
    // state by replaying its events, or check against a highly consistent read-model.
    // For this example, we assume basic validation passes and append the event.
    
    // 3. Construct Event Payload
    const payload = {
      quantityChange: commandData.quantityChange,
      reason: commandData.reason || 'Inventory adjustment'
    };

    // 4. Determine Event Type based on business logic
    const eventType = commandData.quantityChange > 0 ? 'STOCK_ADDED' : 'STOCK_REMOVED';

    // 5. Persist Immutable Event
    const savedEvent = await EventStoreService.appendEvent({
      aggregateId: commandData.aggregateId,
      aggregateType: 'InventoryItem',
      eventType: eventType,
      payload,
      expectedVersion: commandData.expectedVersion,
      actor: commandData.actor || 'system'
    });

    return { 
      message: `Stock update event (${eventType}) appended successfully`,
      aggregateId: commandData.aggregateId, 
      version: savedEvent.version 
    };
  }
}

export default UpdateStockHandler;
