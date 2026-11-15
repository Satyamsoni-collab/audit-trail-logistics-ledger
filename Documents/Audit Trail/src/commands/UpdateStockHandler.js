
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
   * @param {Number} commandData.quantityChange
   * @param {String} commandData.reason
   * @param {Number} commandData.expectedVersion
   * @param {String} [commandData.actor]
   */
  static async handle(commandData) {
    // 1. Validate Command
    if (
      !commandData ||
      typeof commandData.aggregateId !== 'string' ||
      !commandData.aggregateId.trim()
    ) {
      throw new Error(
        'ValidationException: aggregateId is required.'
      );
    }

    // Validate quantityChange
    if (
      !Number.isSafeInteger(commandData.quantityChange) ||
      commandData.quantityChange === 0
    ) {
      throw new Error(
        'ValidationException: quantityChange must be a non-zero safe integer.'
      );
    }

    // Validate expectedVersion
    if (
      !Number.isSafeInteger(commandData.expectedVersion) ||
      commandData.expectedVersion < 0
    ) {
      throw new Error(
        'ValidationException: expectedVersion must be a non-negative integer.'
      );
    }

    // 2. Construct Event Payload
    const payload = {
      quantityChange: commandData.quantityChange,
      reason: commandData.reason || 'Inventory adjustment'
    };

    // 3. Determine Event Type
    const eventType =
      commandData.quantityChange > 0
        ? 'STOCK_ADDED'
        : 'STOCK_REMOVED';

    // 4. Persist Immutable Event
    const savedEvent = await EventStoreService.appendEvent({
      aggregateId: commandData.aggregateId,
      aggregateType: 'InventoryItem',
      eventType,
      payload,
      expectedVersion: commandData.expectedVersion,
      actor: commandData.actor || 'system'
    });

    // 5. Return Result
    return {
      message: `Stock update event (${eventType}) appended successfully`,
      aggregateId: commandData.aggregateId,
      version: savedEvent.version
    };
  }
}

export default UpdateStockHandler;
