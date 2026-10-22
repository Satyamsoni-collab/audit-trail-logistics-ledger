
import InventoryItem from '../../src/models/readModels/InventoryItem.js';

describe('Inventory Read Model Verification', () => {
  const validInventory = {
    aggregateId: 'item-test-101',
    sku: 'SKU-101',
    name: 'Test Inventory Item',
    quantity: 20,
    location: 'Warehouse A',
    status: 'AVAILABLE',
    lastProcessedVersion: 1
  };

  it('should contain all required inventory fields', () => {
    const item = new InventoryItem(validInventory);

    expect(item.validateSync()).toBeUndefined();
    expect(item.aggregateId).toBe('item-test-101');
    expect(item.sku).toBe('SKU-101');
    expect(item.name).toBe('Test Inventory Item');
    expect(item.location).toBe('Warehouse A');
  });

  it('should reject negative inventory quantity', () => {
    const item = new InventoryItem({
      ...validInventory,
      quantity: -5
    });

    expect(item.validateSync()).toBeDefined();
  });

  it('should reject invalid inventory status', () => {
    const item = new InventoryItem({
      ...validInventory,
      status: 'UNKNOWN'
    });

    expect(item.validateSync()).toBeDefined();
  });

  it('should store the last processed event version', () => {
    const item = new InventoryItem(validInventory);

    expect(item.lastProcessedVersion).toBe(1);
  });

  it.skip('should save and retrieve inventory projection from MongoDB', async () => {
    const savedItem = await InventoryItem.create(validInventory);

    const storedItem = await InventoryItem.findOne({
      aggregateId: savedItem.aggregateId
    });

    expect(storedItem).not.toBeNull();
    expect(storedItem.quantity).toBe(20);
    expect(storedItem.status).toBe('AVAILABLE');
    expect(storedItem.lastProcessedVersion).toBe(1);

    await InventoryItem.deleteOne({ _id: savedItem._id });
  });
});
