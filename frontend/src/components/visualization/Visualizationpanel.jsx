
import React, { useState } from "react";
import SensorChart from "./SensorChart";
import ShipmentTimeline from "./ShipmentTimeline";
import StateScrubber from "./StateScrubber";

// Demo data until the backend API is connected.
const shipmentStates = [
  {
    type: "CONTAINER_CREATED",
    time: "08:00",
    state: "Container created",
  },
  {
    type: "LOADED_ON_SHIP",
    time: "10:30",
    state: "Container loaded on ship",
  },
  {
    type: "TEMPERATURE_SPIKE",
    time: "14:00",
    state: "Temperature anomaly detected",
  },
  {
    type: "ARRIVED_AT_PORT",
    time: "18:00",
    state: "Arrived at destination port",
  },
];

function getSeverity(type) {
  if (type === "TEMPERATURE_SPIKE") return "High";
  if (type === "LOADED_ON_SHIP") return "Medium";
  return "Normal";
}

function VisualizationPanel() {
  const [events] = useState(shipmentStates);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shipmentId, setShipmentId] = useState("");
  const [searchedShipment, setSearchedShipment] = useState("");
  const [searchError, setSearchError] = useState("");

  const currentState = events[currentIndex] || null;
  const currentSeverity = getSeverity(currentState?.type);
  const totalEvents = events.length;

  const criticalEvents = events.filter(
    (event) => getSeverity(event.type) === "High"
  ).length;

  const warningEvents = events.filter(
    (event) => getSeverity(event.type) === "Medium"
  ).length;

  const handleEventSelect = (event) => {
    if (!event) return;

    const eventType = event.type || event.event;
    const index = events.findIndex(
      (item) => (item.type || item.event) === eventType
    );

    if (index !== -1) {
      setCurrentIndex(index);
      setSearchError("");
    }
  };

  const handleScrubberChange = (index) => {
    const safeIndex = Math.max(
      0,
      Math.min(Number(index) || 0, events.length - 1)
    );

    setCurrentIndex(safeIndex);
    setSearchError("");
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const trimmedId = shipmentId.trim();

    if (!trimmedId) {
      setSearchError("Please enter a shipment ID.");
      return;
    }

    setSearchedShipment(trimmedId);
    setShipmentId(trimmedId);
    setCurrentIndex(0);
    setSearchError("");
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setShipmentId("");
    setSearchedShipment("");
    setSearchError("");
  };

  const selectedEvent = currentState;
  const selectedSeverity = getSeverity(selectedEvent?.type);

  const reconstructedState =
    selectedEvent?.state || "State information unavailable";

  return (
    <section className="visualization-panel">
      <div className="visualization-header">
        <div>
          <p className="section-eyebrow">LOGISTICS MONITORING</p>
          <h2>Shipment Visualization</h2>
          <p>
            Monitor shipment events, sensor history, and reconstructed
            shipment states.
          </p>
        </div>

        <span className="visualization-status">
          <span className="status-indicator" />
          Visualization Ready
        </span>
      </div>

      <form className="shipment-search" onSubmit={handleSearch} role="search">
        <input
          type="text"
          placeholder="Enter Shipment ID"
          aria-label="Shipment ID"
          value={shipmentId}
          onChange={(event) => {
            setShipmentId(event.target.value);
            if (searchError) setSearchError("");
          }}
        />
        <button type="submit">Search Shipment</button>
      </form>

      {searchError && (
        <p className="search-error" role="alert">
          {searchError}
        </p>
      )}

      {searchedShipment && (
        <div className="searched-shipment">
          <span className="status-indicator" />
          <span>
            Showing shipment: <strong>{searchedShipment}</strong>
          </span>
          <span className="sample-data-note">Sample data</span>
        </div>
      )}

      <div className="visualization-actions">
        <div>
          <h3>Shipment Analytics</h3>
          <p>Review event activity and shipment sensor readings.</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="reset-button"
        >
          Reset Visualization
        </button>
      </div>

      <div className="shipment-metrics">
        <article className="metric-card">
          <span className="metric-label">TOTAL EVENTS</span>
          <strong className="metric-value">{totalEvents}</strong>
          <span className="metric-description">Recorded shipment events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">CRITICAL EVENTS</span>
          <strong className="metric-value metric-danger">
            {criticalEvents}
          </strong>
          <span className="metric-description">High-severity events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">WARNING EVENTS</span>
          <strong className="metric-value metric-warning">
            {warningEvents}
          </strong>
          <span className="metric-description">Medium-severity events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">CURRENT SEVERITY</span>
          <strong
            className={`metric-value ${
              currentSeverity === "High"
                ? "metric-danger"
                : currentSeverity === "Medium"
                ? "metric-warning"
                : "metric-normal"
            }`}
          >
            {currentSeverity}
          </strong>
          <span className="metric-description">
            At {currentState?.time || "--:--"}
          </span>
        </article>
      </div>

      <div className="visualization-grid">
        <SensorChart currentIndex={currentIndex} />

        <ShipmentTimeline
          selectedEvent={selectedEvent}
          onSelectEvent={handleEventSelect}
        />
      </div>

      <StateScrubber
        events={events}
        currentIndex={currentIndex}
        onChange={handleScrubberChange}
      />

      <div className="state-preview">
        <div className="state-preview-header">
          <div>
            <p className="section-eyebrow">EVENT INSPECTOR</p>
            <h3>Shipment State Preview</h3>
          </div>

          <span
            className={`preview-severity ${selectedSeverity.toLowerCase()}`}
          >
            {selectedSeverity} Severity
          </span>
        </div>

        {selectedEvent ? (
          <div className="state-preview-details">
            <div className="state-row">
              <span>Selected Event</span>
              <strong>{selectedEvent.type}</strong>
            </div>

            <div className="state-row">
              <span>Severity</span>
              <strong
                className={`preview-severity ${selectedSeverity.toLowerCase()}`}
              >
                {selectedSeverity}
              </strong>
            </div>

            <div className="state-row">
              <span>Event Time</span>
              <strong>{selectedEvent.time || "Unavailable"}</strong>
            </div>

            <div className="state-row">
              <span>Reconstructed State</span>
              <strong>{reconstructedState}</strong>
            </div>
          </div>
        ) : (
          <div className="state-preview-empty">
            <strong>No shipment state available</strong>
            <p>Select a shipment with available event history.</p>
          </div>
        )}
      </div>

      <p className="visualization-footer">
        Audit Trail Logistics Ledger
        <span> • </span>
        Event history and sensor monitoring
      </p>
    </section>
  );
}

export default VisualizationPanel;
