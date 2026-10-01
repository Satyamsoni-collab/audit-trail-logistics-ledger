const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  aggregateId: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    required: true
  }
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;