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

function ShipmentTimeline({ selectedEvent, onSelectEvent }) {
  return (
    <div className="shipment-timeline">
      <div className="timeline-header">
        <h3>Event Timeline</h3>
        <span>Shipment History</span>
      </div>

      <div className="timeline-list">
        {shipmentEvents.map((event) => (
          <button
            className={`timeline-item ${
              selectedEvent?.id === event.id ? "selected" : ""
            }`}
            key={event.id}
            onClick={() => onSelectEvent(event)}
          >
            <div className="timeline-marker"></div>

            <div className="timeline-content">
              <div className="timeline-time">{event.time}</div>
              <h4>{event.type}</h4>
              <p>{event.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export { shipmentEvents };
export default ShipmentTimeline;