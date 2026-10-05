const assert = require("node:assert/strict");
const Event = require("../src/eventStore/eventModel");

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
// RUN ALL TESTS
// -----------------------------------

async function runAllTests() {
  await runTests();
  console.log("");
  await runValidationTests();
}

runAllTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});