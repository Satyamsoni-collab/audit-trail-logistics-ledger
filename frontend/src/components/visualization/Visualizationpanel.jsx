
import React, { useState } from "react";
import SensorChart from "./SensorChart";
import ShipmentTimeline from "./ShipmentTimeline";
import StateScrubber from "./StateScrubber";
import { fetchShipmentEvents } from "../../services/shipmentApi";

// Demo data is shown only before a shipment is searched.
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

function formatEventTime(timestamp) {
  if (!timestamp) return "Unavailable";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeEvents(events = []) {
  return events.map((event, index) => {
    const type = event.type || event.eventType || event.event || "UNKNOWN_EVENT";
    const payload = event.payload || {};

    return {
      ...event,
      type,
      time: event.time || formatEventTime(event.timestamp),
      state:
        event.state ||
        payload.state ||
        payload.description ||
        type.replaceAll("_", " "),
      version: event.version ?? index + 1,
    };
  });
}

function VisualizationPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shipmentId, setShipmentId] = useState("");
  const [searchedShipment, setSearchedShipment] = useState("");
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);

  // null means no API search has been performed yet.
  const [apiEvents, setApiEvents] = useState(null);

  const isSearching = searchedShipment !== "";
  const events = apiEvents === null ? shipmentStates : apiEvents;
  const hasEvents = events.length > 0;

  const currentIndexSafe = hasEvents
    ? Math.min(currentIndex, events.length - 1)
    : 0;

  const currentState = hasEvents ? events[currentIndexSafe] : null;
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

    const eventType = event.type || event.eventType || event.event;
    const eventVersion = event.version;

    const index = events.findIndex((item) =>
      eventVersion != null
        ? item.version === eventVersion
        : (item.type || item.eventType || item.event) === eventType
    );

    if (index !== -1) {
      setCurrentIndex(index);
      setSearchError("");
    }
  };

  const handleScrubberChange = (index) => {
    if (!hasEvents) return;

    const safeIndex = Math.max(
      0,
      Math.min(Number(index) || 0, events.length - 1)
    );

    setCurrentIndex(safeIndex);
    setSearchError("");
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    const trimmedId = shipmentId.trim();

    if (!trimmedId) {
      setSearchError("Please enter a shipment ID.");
      return;
    }

    setLoading(true);
    setSearchError("");
    setSearchedShipment(trimmedId);
    setApiEvents([]);
    setCurrentIndex(0);

    try {
      const result = await fetchShipmentEvents(trimmedId);
      setApiEvents(normalizeEvents(result.events));
    } catch (error) {
      setApiEvents([]);
      setSearchError(
        error.message || "Unable to load shipment event history."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setShipmentId("");
    setSearchedShipment("");
    setSearchError("");
    setApiEvents(null);
    setLoading(false);
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
          {loading ? "Loading Events" : "Visualization Ready"}
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

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search Shipment"}
        </button>
      </form>

      {searchError && (
        <p className="search-error" role="alert">
          {searchError}
        </p>
      )}

      {isSearching && (
        <div className="searched-shipment">
          <span className="status-indicator" />
          <span>
            Shipment: <strong>{searchedShipment}</strong>
          </span>
          <span className="sample-data-note">Live API</span>
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
          disabled={loading}
        >
          Reset Visualization
        </button>
      </div>

      <div className="shipment-metrics">
        <article className="metric-card">
          <span className="metric-label">TOTAL EVENTS</span>
          <strong className="metric-value">
            {loading ? "—" : totalEvents}
          </strong>
          <span className="metric-description">Recorded shipment events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">CRITICAL EVENTS</span>
          <strong className="metric-value metric-danger">
            {loading ? "—" : criticalEvents}
          </strong>
          <span className="metric-description">High-severity events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">WARNING EVENTS</span>
          <strong className="metric-value metric-warning">
            {loading ? "—" : warningEvents}
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
            {loading ? "—" : currentState ? currentSeverity : "N/A"}
          </strong>
          <span className="metric-description">
            At {currentState?.time || "--:--"}
          </span>
        </article>
      </div>

      {loading && (
        <p className="state-preview-empty" role="status">
          Loading event history for {searchedShipment}...
        </p>
      )}

      {!loading && !searchError && isSearching && events.length === 0 && (
        <div className="state-preview-empty">
          <strong>No events found</strong>
          <p>
            No event history was returned for this shipment ID. Check the ID
            or confirm that events exist in the backend database.
          </p>
        </div>
      )}

      {!loading && hasEvents && (
        <>
          <div className="visualization-grid">
            <SensorChart currentIndex={currentIndexSafe} />

            <ShipmentTimeline
              selectedEvent={selectedEvent}
              onSelectEvent={handleEventSelect}
            />
          </div>

          <StateScrubber
            events={events}
            currentIndex={currentIndexSafe}
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
                  <span>Event Version</span>
                  <strong>{selectedEvent.version ?? "Unavailable"}</strong>
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
                <p>Select an event with available history.</p>
              </div>
            )}
          </div>
        </>
      )}

      <p className="visualization-footer">
        Audit Trail Logistics Ledger
        <span> • </span>
        Event history and sensor monitoring
      </p>
    </section>
  );
}

export default VisualizationPanel;
