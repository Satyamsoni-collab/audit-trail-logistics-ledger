import React from "react";

const shipmentEvents = [
  {
    time: "08:00",
    type: "CONTAINER_CREATED",
    description: "Shipment container was created."
  },
  {
    time: "10:30",
    type: "LOADED_ON_SHIP",
    description: "Container was loaded onto the ship."
  },
  {
    time: "14:00",
    type: "TEMPERATURE_SPIKE",
    description: "Temperature increased above the normal range."
  },
  {
    time: "18:00",
    type: "ARRIVED_AT_PORT",
    description: "Container arrived at the destination port."
  }
];

function ShipmentTimeline() {
  return (
    <div className="shipment-timeline">
      <div className="timeline-header">
        <h3>Event Timeline</h3>
        <span>Shipment History</span>
      </div>

      <div className="timeline-list">
        {shipmentEvents.map((event, index) => (
          <div className="timeline-item" key={`${event.type}-${index}`}>
            <div className="timeline-marker"></div>

            <div className="timeline-content">
              <div className="timeline-time">{event.time}</div>
              <h4>{event.type}</h4>
              <p>{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShipmentTimeline;