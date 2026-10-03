const assert = require("node:assert/strict");
const Event = require("../src/eventStore/eventModel");

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

  console.log(`\n${passed}/10 tests passed`);

  if (passed !== 10) {
    process.exitCode = 1;
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});