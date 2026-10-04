const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  aggregateId: {
    type: String,
    required: true,
    trim: true,
    minlength: 1
  },
  eventType: {
    type: String,
    required: true,
    trim: true,
    minlength: 1
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
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: "Event version must be an integer"
    }
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

eventSchema.pre("bulkWrite", function (operations) {
  for (const operation of operations) {
    if (!operation.insertOne) {
      throw new Error(
        "Events are immutable: bulk updates and deletions are not allowed"
      );
    }
  }
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;