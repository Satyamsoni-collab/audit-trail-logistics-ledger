import React from "react";

const shipmentEvents = [
  {
    id: 1,
    time: "08:00",
    type: "CONTAINER_CREATED",
    description: "Shipment container was created.",
    state: "Container created"
  },
  {
    id: 2,
    time: "10:30",
    type: "LOADED_ON_SHIP",
    description: "Container was loaded onto the ship.",
    state: "Container loaded on ship"
  },
  {
    id: 3,
    time: "14:00",
    type: "TEMPERATURE_SPIKE",
    description: "Temperature increased above the normal range.",
    state: "Temperature alert detected"
  },
  {
    id: 4,
    time: "18:00",
    type: "ARRIVED_AT_PORT",
    description: "Container arrived at the destination port.",
    state: "Container arrived at port"
  }
];

const getEventSeverity = (eventType) => {
  if (eventType === "TEMPERATURE_SPIKE") {
    return "High";
  }

  if (eventType === "LOADED_ON_SHIP") {
    return "Medium";
  }

  return "Normal";
};

const getEventDuration = (index) => {
  if (index === 0) {
    return "Start";
  }

  const previous = shipmentEvents[index - 1];
  const current = shipmentEvents[index];

  const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const difference =
    toMinutes(current.time) - toMinutes(previous.time);

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

function ShipmentTimeline({ selectedEvent, onSelectEvent }) {
  const [filter, setFilter] = React.useState("ALL");

  const filteredEvents =
    filter === "ALL"
      ? shipmentEvents
      : shipmentEvents.filter((event) => event.type === filter);

  const eventCount = filteredEvents.length;

  return (
    <div className="shipment-timeline">

      <div className="timeline-header">
        <div>
          <h3>Event Timeline</h3>
          <span>Shipment History</span>
        </div>

        <div className="timeline-summary">
          <span>Events</span>
          <strong>{eventCount}</strong>
        </div>
      </div>

      <div className="timeline-filters">
        <button
          className={filter === "ALL" ? "active" : ""}
          onClick={() => setFilter("ALL")}
        >
          All
        </button>

        <button
          className={filter === "CONTAINER_CREATED" ? "active" : ""}
          onClick={() => setFilter("CONTAINER_CREATED")}
        >
          Created
        </button>

        <button
          className={filter === "LOADED_ON_SHIP" ? "active" : ""}
          onClick={() => setFilter("LOADED_ON_SHIP")}
        >
          Loaded
        </button>

        <button
          className={filter === "TEMPERATURE_SPIKE" ? "active" : ""}
          onClick={() => setFilter("TEMPERATURE_SPIKE")}
        >
          Temperature
        </button>

        <button
          className={filter === "ARRIVED_AT_PORT" ? "active" : ""}
          onClick={() => setFilter("ARRIVED_AT_PORT")}
        >
          Arrival
        </button>
      </div>

      <div className="timeline-list">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const eventIndex = shipmentEvents.findIndex(
              (item) => item.id === event.id
            );

            return (
              <button
                className={`timeline-item ${
                  selectedEvent?.id === event.id ? "selected" : ""
                }`}
                key={event.id}
                onClick={() => onSelectEvent(event)}
              >
                <div className="timeline-marker"></div>

                <div className="timeline-content">
                  <div className="timeline-time">
                    {event.time}
                  </div>

                  <div className="event-title">
                    <h4>{event.type}</h4>

                    <span
                      className={`event-severity ${getEventSeverity(
                        event.type
                      ).toLowerCase()}`}
                    >
                      {getEventSeverity(event.type)}
                    </span>
                  </div>

                  <p>{event.description}</p>

                  <span className="event-duration">
                    {getEventDuration(eventIndex)} since previous event
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="timeline-empty">
            <strong>No events found</strong>
            <p>
              No shipment events match the selected filter.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

export { shipmentEvents };
export default ShipmentTimeline;