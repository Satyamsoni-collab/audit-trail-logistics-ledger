import React, { useEffect } from "react";

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
  const safeIndex = Math.max(
    0,
    Math.min(shipmentStates.length - 1, Number(currentIndex) || 0)
  );

  const currentState = shipmentStates[safeIndex];

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Do not intercept keyboard shortcuts while typing in another control.
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target instanceof HTMLInputElement &&
          event.target.type !== "range" ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        event.target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange(Math.max(0, safeIndex - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange(Math.min(shipmentStates.length - 1, safeIndex + 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        onChange(0);
      } else if (event.key === "End") {
        event.preventDefault();
        onChange(shipmentStates.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [safeIndex, onChange]);

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
        step="1"
        value={safeIndex}
        onChange={(event) => onChange(Number(event.target.value))}
        className="scrubber-slider"
        aria-label="Shipment history state"
        aria-valuetext={`${currentState.time}: ${currentState.state}`}
      />

      <div className="scrubber-labels">
        {shipmentStates.map((state) => (
          <span key={state.index}>{state.time}</span>
        ))}
      </div>

      <div className="scrubber-state" aria-live="polite">
        <span>Current Event</span>
        <strong>{currentState.event}</strong>

        <span>Shipment State</span>
        <strong>{currentState.state}</strong>
      </div>

      <p className="scrubber-keyboard-help">
        Keyboard: ← Previous · → Next · Home First · End Latest
      </p>
    </div>
  );
}

export default StateScrubber;