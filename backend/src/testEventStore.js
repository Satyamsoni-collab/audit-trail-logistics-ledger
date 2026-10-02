require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Event = require("./eventStore/eventModel");
const EventStore = require("./eventStore/eventStore");

const testEventStore = async () => {
  try {
    await connectDB();

    const store = new EventStore(Event);

    const savedEvent = await store.appendEvent({
      aggregateId: "test-shipment-001",
      eventType: "ShipmentCreated",
      payload: { status: "Created" },
      version: 1
    });

    console.log("Event saved successfully:", savedEvent._id);
  } catch (error) {
    console.error("Event Store test failed:", error.message);
  } finally {
    await mongoose.connection.close();
  }
};

testEventStore();