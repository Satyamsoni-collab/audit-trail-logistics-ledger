class EventStore {
  constructor(eventModel) {
    this.eventModel = eventModel;
  }

  async appendEvent(eventData) {
    const event = new this.eventModel(eventData);
    return await event.save();
  }

  async getEventsByAggregateId(aggregateId) {
    return await this.eventModel
      .find({ aggregateId })
      .sort({ version: 1 });
  }
}

module.exports = EventStore;