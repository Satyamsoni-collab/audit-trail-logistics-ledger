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

const blockUpdate = function () {
  throw new Error("Events are immutable: updates are not allowed");
};

const blockDelete = function () {
  throw new Error("Events are immutable: deletion is not allowed");
};

eventSchema.pre("updateOne", blockUpdate);
eventSchema.pre("updateMany", blockUpdate);
eventSchema.pre("findOneAndUpdate", blockUpdate);
eventSchema.pre("replaceOne", blockUpdate);
eventSchema.pre("findOneAndReplace", blockUpdate);

eventSchema.pre("deleteOne", blockDelete);
eventSchema.pre("deleteMany", blockDelete);
eventSchema.pre("findOneAndDelete", blockDelete);

eventSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Events are immutable: updates are not allowed");
  }
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;