class EventStore {
  constructor(eventModel) {
    this.eventModel = eventModel;
  }

  async appendEvent(eventData) {
    const event = new this.eventModel(eventData);
    return await event.save();
  }
}

module.exports = EventStore;