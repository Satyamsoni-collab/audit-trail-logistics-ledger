import React from "react";

const shipmentStates = [
  {
    index: 0,
    time: "08:00",
    event: "CONTAINER_CREATED",
    state: "Container created"
  },
  {
    index: 1,
    time: "10:30",
    event: "LOADED_ON_SHIP",
    state: "Container loaded on ship"
  },
  {
    index: 2,
    time: "14:00",
    event: "TEMPERATURE_SPIKE",
    state: "Temperature alert detected"
  },
  {
    index: 3,
    time: "18:00",
    event: "ARRIVED_AT_PORT",
    state: "Container arrived at port"
  }
];

function StateScrubber({ currentIndex, onChange }) {
  const currentState = shipmentStates[currentIndex];

  return (
    <div className="state-scrubber">
      <div className="scrubber-header">
        <div>
          <h3>State Scrubbing</h3>
          <p>Rewind shipment history to inspect previous states.</p>
        </div>

        <span>{currentState.time}</span>
      </div>

      <input
        type="range"
        min="0"
        max={shipmentStates.length - 1}
        value={currentIndex}
        onChange={(event) => onChange(Number(event.target.value))}
        className="scrubber-slider"
      />

      <div className="scrubber-labels">
        {shipmentStates.map((state) => (
          <span key={state.index}>{state.time}</span>
        ))}
      </div>

      <div className="scrubber-state">
        <span>Current Event</span>
        <strong>{currentState.event}</strong>

        <span>Shipment State</span>
        <strong>{currentState.state}</strong>
      </div>
    </div>
  );
}

export default StateScrubber;