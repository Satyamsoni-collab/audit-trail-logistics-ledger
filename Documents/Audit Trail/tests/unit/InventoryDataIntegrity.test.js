
import InventoryItem from '../../src/models/readModels/InventoryItem.js';

describe('Inventory Read Model - Data Integrity Tests', () => {
  const validInventory = {
    aggregateId: 'item-integrity-101',
    sku: 'SKU-101',
    name: 'Test Inventory Item',
    quantity: 20,
    location: 'Warehouse A',
    status: 'AVAILABLE',
    lastProcessedVersion: 1
  };

  // Test 1: Required fields
  it.each([
    'aggregateId',
    'sku',
    'name',
    'location'
  ])('should reject missing required field: %s', (field) => {
    const data = { ...validInventory };
    delete data[field];

    const item = new InventoryItem(data);
    const error = item.validateSync();

    expect(error).toBeDefined();
    expect(error.errors[field]).toBeDefined();
  });

  // Test 2: Zero quantity
  it('should accept zero inventory quantity', () => {
    const item = new InventoryItem({
      ...validInventory,
      quantity: 0
    });

    expect(item.validateSync()).toBeUndefined();
    expect(item.quantity).toBe(0);
  });

  // Test 3: All allowed statuses
  it.each([
    'AVAILABLE',
    'RESERVED',
    'OUT_OF_STOCK',
    'DISCONTINUED'
  ])('should accept valid status: %s', (status) => {
    const item = new InventoryItem({
      ...validInventory,
      status
    });

    expect(item.validateSync()).toBeUndefined();
    expect(item.status).toBe(status);
  });

  // Test 4: Default event version
  it('should default lastProcessedVersion to zero', () => {
    const item = new InventoryItem({
      ...validInventory,
      lastProcessedVersion: undefined
    });

    expect(item.validateSync()).toBeUndefined();
    expect(item.lastProcessedVersion).toBe(0);
  });

  // Test 5: Unique aggregateId index configuration
  it('should configure aggregateId as a unique index', () => {
    const indexes = InventoryItem.schema.indexes();

    const hasUniqueAggregateIdIndex = indexes.some(
      ([fields, options]) =>
        fields.aggregateId === 1 && options.unique === true
    );

    expect(hasUniqueAggregateIdIndex).toBe(true);
  });

  // Test 6: Reject negative and decimal event versions
  it.each([-1, -5, 1.5, 2.7])(
    'should reject invalid event version: %s',
    (version) => {
      const item = new InventoryItem({
        ...validInventory,
        lastProcessedVersion: version
      });

      const error = item.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.lastProcessedVersion).toBeDefined();
    }
  );

  // Test 7: Accept valid event versions
  it.each([0, 1, 10, 100])(
    'should accept valid event version: %s',
    (version) => {
      const item = new InventoryItem({
        ...validInventory,
        lastProcessedVersion: version
      });

      expect(item.validateSync()).toBeUndefined();
    }
  );

  // Test 8: Reject negative and decimal inventory quantities
  it.each([-5, -1, 2.5, 10.7])(
    'should reject invalid inventory quantity: %s',
    (quantity) => {
      const item = new InventoryItem({
        ...validInventory,
        quantity
      });

      const error = item.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
    }
  );

  // Test 9: Accept valid inventory quantities
  it.each([0, 1, 10, 100])(
    'should accept valid inventory quantity: %s',
    (quantity) => {
      const item = new InventoryItem({
        ...validInventory,
        quantity
      });

      expect(item.validateSync()).toBeUndefined();
      expect(item.quantity).toBe(quantity);
    }
  );

  // Test 10: Reject invalid inventory statuses
  it.each(['INVALID', 'PENDING', 'UNKNOWN'])(
    'should reject invalid inventory status: %s',
    (status) => {
      const item = new InventoryItem({
        ...validInventory,
        status
      });

      const error = item.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    }
  );
});
