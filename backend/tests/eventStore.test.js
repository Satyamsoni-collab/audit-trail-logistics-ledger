const assert = require("node:assert/strict");
const Event = require("../src/eventStore/eventModel");
const EventStore = require("../src/eventStore/eventStore");

// -----------------------------------
// IMMUTABILITY TESTS
// -----------------------------------

const tests = {
  updateOne: () => Event.updateOne({}, { eventType: "Modified" }),

  updateMany: () => Event.updateMany({}, { eventType: "Modified" }),

  findOneAndUpdate: () =>
    Event.findOneAndUpdate({}, { eventType: "Modified" }),

  replaceOne: () =>
    Event.replaceOne({}, { aggregateId: "test" }),

  findOneAndReplace: () =>
    Event.findOneAndReplace({}, { aggregateId: "test" }),

  deleteOne: () => Event.deleteOne({}),

  deleteMany: () => Event.deleteMany({}),

  findOneAndDelete: () => Event.findOneAndDelete({}),

  bulkWrite: () =>
    Event.bulkWrite([
      {
        updateOne: {
          filter: { aggregateId: "test" },
          update: { eventType: "Modified" },
        },
      },
    ]),
};

async function runTests() {
  let passed = 0;

  for (const [name, operation] of Object.entries(tests)) {
    try {
      await assert.rejects(operation(), /Events are immutable:/);
      console.log(`PASS: ${name}`);
      passed++;
    } catch (error) {
      console.error(`FAIL: ${name} - ${error.message}`);
    }
  }

  const existingEvent = new Event({
    aggregateId: "test-001",
    eventType: "Created",
    payload: { status: "Created" },
    version: 1,
  });

  existingEvent.isNew = false;

  try {
    await assert.rejects(
      existingEvent.save(),
      /Events are immutable:/
    );

    console.log("PASS: existing document save");
    passed++;
  } catch (error) {
    console.error(`FAIL: existing document save - ${error.message}`);
  }

  console.log(`\n${passed}/10 immutability tests passed`);

  if (passed !== 10) {
    process.exitCode = 1;
  }
}

// -----------------------------------
// INPUT VALIDATION TESTS
// -----------------------------------

async function runValidationTests() {
  const validationCases = [
    {
      name: "empty aggregateId",
      data: {
        aggregateId: "   ",
        eventType: "Created",
        payload: {},
        version: 1,
      },
    },
    {
      name: "empty eventType",
      data: {
        aggregateId: "test-001",
        eventType: "   ",
        payload: {},
        version: 1,
      },
    },
    {
      name: "zero version",
      data: {
        aggregateId: "test-001",
        eventType: "Created",
        payload: {},
        version: 0,
      },
    },
    {
      name: "negative version",
      data: {
        aggregateId: "test-001",
        eventType: "Created",
        payload: {},
        version: -1,
      },
    },
    {
      name: "decimal version",
      data: {
        aggregateId: "test-001",
        eventType: "Created",
        payload: {},
        version: 1.5,
      },
    },
  ];

  let passed = 0;

  for (const test of validationCases) {
    const event = new Event(test.data);

    try {
      await assert.rejects(event.validate());
      console.log(`PASS: ${test.name} rejected`);
      passed++;
    } catch (error) {
      console.error(`FAIL: ${test.name} - ${error.message}`);
    }
  }

  const validEvent = new Event({
    aggregateId: "test-001",
    eventType: "Created",
    payload: {},
    version: 1,
  });

  try {
    await validEvent.validate();
    console.log("PASS: valid event accepted");
    passed++;
  } catch (error) {
    console.error(`FAIL: valid event - ${error.message}`);
  }

  console.log(`\n${passed}/6 validation tests passed`);

  if (passed !== 6) {
    process.exitCode = 1;
  }
}

// -----------------------------------
// EVENT RETRIEVAL TEST
// -----------------------------------

async function runRetrievalTest() {
  let receivedFilter;
  let receivedSort;

  const mockEventModel = {
    find(filter) {
      receivedFilter = filter;

      return {
        async sort(sortOrder) {
          receivedSort = sortOrder;

          return [
            {
              aggregateId: "shipment-001",
              eventType: "ShipmentCreated",
              version: 1,
            },
            {
              aggregateId: "shipment-001",
              eventType: "ShipmentUpdated",
              version: 2,
            },
          ];
        },
      };
    },
  };

  const eventStore = new EventStore(mockEventModel);

  try {
    const events = await eventStore.getEventsByAggregateId(
      "shipment-001"
    );

    assert.deepEqual(receivedFilter, {
      aggregateId: "shipment-001",
    });

    assert.deepEqual(receivedSort, {
      version: 1,
    });

    assert.equal(events.length, 2);
    assert.equal(events[0].version, 1);
    assert.equal(events[1].version, 2);

    console.log(
      "PASS: events retrieved by aggregateId in version order"
    );
  } catch (error) {
    console.error(`FAIL: event retrieval - ${error.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------
// RUN ALL TESTS
// -----------------------------------

async function runAllTests() {
  await runTests();

  console.log("");

  await runValidationTests();

  console.log("");

  await runRetrievalTest();
}

runAllTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});