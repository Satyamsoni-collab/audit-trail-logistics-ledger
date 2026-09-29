import EventStoreService from '../services/EventStoreService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Command Handler for Creating a new Inventory Item.
 * In CQRS, Handlers encapsulate the business logic for a specific command.
 */
class CreateItemHandler {
  /**
   * Executes the CreateItem command.
   * 
   * @param {Object} commandData
   * @param {String} commandData.sku
   * @param {String} commandData.name
   * @param {String} [commandData.location]
   * @param {Number} [commandData.initialQuantity]
   * @param {String} [commandData.actor]
   * @returns {Promise<Object>} Result containing the new aggregateId
   */
  static async handle(commandData) {
    // 1. Validate Command (Business Logic)
    if (!commandData.sku || !commandData.name) {
      throw new Error('ValidationException: SKU and Name are required to create an item.');
    }

    if (commandData.initialQuantity !== undefined && commandData.initialQuantity < 0) {
      throw new Error('ValidationException: Initial quantity cannot be negative.');
    }

    // 2. Generate new Aggregate ID for the Item
    const aggregateId = uuidv4();
    
    // 3. Construct Event Payload
    const payload = {
      sku: commandData.sku,
      name: commandData.name,
      location: commandData.location || 'MAIN_WAREHOUSE',
      quantity: commandData.initialQuantity || 0
    };

    // 4. Persist Immutable Event to the Event Store
    // Since it's a new item, the expected current version is 0.
    const savedEvent = await EventStoreService.appendEvent({
      aggregateId,
      aggregateType: 'InventoryItem',
      eventType: 'ITEM_CREATED',
      payload,
      expectedVersion: 0, 
      actor: commandData.actor || 'system'
    });

    return { 
      message: 'Item creation event appended successfully',
      aggregateId, 
      version: savedEvent.version 
    };
  }
}

export default CreateItemHandler;
