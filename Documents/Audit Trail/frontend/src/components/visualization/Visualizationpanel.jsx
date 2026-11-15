
import React, { useState } from "react";
import SensorChart from "./SensorChart";
import ShipmentTimeline from "./ShipmentTimeline";
import StateScrubber from "./StateScrubber";
import { fetchShipmentEvents } from "../../services/shipmentApi";

const DEMO_EVENTS = [
  { type: "CONTAINER_CREATED", time: "08:00", state: "Container created", version: 1 },
  { type: "LOADED_ON_SHIP", time: "10:30", state: "Container loaded on ship", version: 2 },
  { type: "TEMPERATURE_SPIKE", time: "14:00", state: "Temperature anomaly detected", version: 3 },
  { type: "ARRIVED_AT_PORT", time: "18:00", state: "Arrived at destination port", version: 4 },
];

function getSeverity(type = "") {
  const normalized = String(type).replace(/[^a-z0-9]/gi, "").toUpperCase();

  if (
    normalized.includes("TEMPERATURESPIKE") ||
    normalized.includes("CRITICAL") ||
    normalized.includes("ALERT")
  ) {
    return "High";
  }

  if (
    normalized.includes("LOADEDONSHIP") ||
    normalized.includes("WARNING")
  ) {
    return "Medium";
  }

  return "Normal";
}

function formatEventTime(timestamp) {
  if (!timestamp) return "Unavailable";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return String(timestamp);

  return date.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizeEvents(input = []) {
  return [...input]
    .sort((a, b) => Number(a.version ?? 0) - Number(b.version ?? 0))
    .map((event, index) => {
      const type =
        event.type || event.eventType || event.event || "UNKNOWN_EVENT";

      const payload =
        event.payload && typeof event.payload === "object"
          ? event.payload
          : {};

      return {
        ...event,
        type,
        version: event.version ?? index + 1,
        time: event.time || formatEventTime(event.timestamp),
        state:
          event.state ||
          payload.state ||
          payload.description ||
          type.replace(/[_-]/g, " "),
      };
    });
}

function VisualizationPanel() {
  const [shipmentId, setShipmentId] = useState("");
  const [searchedShipment, setSearchedShipment] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [apiEvents, setApiEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Demo events appear only before the first API search.
  const events = apiEvents === null ? DEMO_EVENTS : apiEvents;
  const hasEvents = events.length > 0;
  const index = hasEvents
    ? Math.min(currentIndex, events.length - 1)
    : 0;

  const selectedEvent = hasEvents ? events[index] : null;
  const severity = getSeverity(selectedEvent?.type);

  const criticalCount = events.filter(
    (event) => getSeverity(event.type) === "High"
  ).length;

  const warningCount = events.filter(
    (event) => getSeverity(event.type) === "Medium"
  ).length;

  const handleSearch = async (event) => {
    event.preventDefault();

    const id = shipmentId.trim();

    if (!id) {
      setSearchError("Please enter a shipment ID.");
      return;
    }

    setLoading(true);
    setSearchError("");
    setSearchedShipment(id);
    setApiEvents([]);
    setCurrentIndex(0);

    try {
      const result = await fetchShipmentEvents(id);

      if (!result || !Array.isArray(result.events)) {
        throw new Error("The API returned an invalid event history.");
      }

      setApiEvents(normalizeEvents(result.events));
    } catch (error) {
      setApiEvents([]);
      setSearchError(
        error.message || "Unable to retrieve shipment events."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (selected) => {
    if (!selected) return;

    const foundIndex = events.findIndex((item) => {
      if (
        selected.version != null &&
        item.version != null
      ) {
        return String(item.version) === String(selected.version);
      }

      return item.type === (
        selected.type || selected.eventType || selected.event
      );
    });

    if (foundIndex >= 0) {
      setCurrentIndex(foundIndex);
    }
  };

  const handleScrubberChange = (nextIndex) => {
    if (!hasEvents) return;

    const safeIndex = Math.max(
      0,
      Math.min(Number(nextIndex) || 0, events.length - 1)
    );

    setCurrentIndex(safeIndex);
  };

  const handleReset = () => {
    setShipmentId("");
    setSearchedShipment("");
    setCurrentIndex(0);
    setApiEvents(null);
    setSearchError("");
  };

  return (
    <section className="visualization-panel">
      <header className="visualization-header">
        <div>
          <p className="section-eyebrow">LOGISTICS MONITORING</p>
          <h2>Shipment Visualization</h2>
          <p>
            Explore shipment events, event history, and reconstructed states.
          </p>
        </div>

        <span className="visualization-status">
          <span className="status-indicator" />
          {loading ? "Loading Events" : "Visualization Ready"}
        </span>
      </header>

      <form className="shipment-search" onSubmit={handleSearch} role="search">
        <input
          type="text"
          value={shipmentId}
          onChange={(event) => setShipmentId(event.target.value)}
          placeholder="Enter Shipment ID"
          aria-label="Shipment ID"
          disabled={loading}
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

      {searchedShipment && (
        <div className="searched-shipment">
          <span className="status-indicator" />
          <span>
            Shipment: <strong>{searchedShipment}</strong>
          </span>
          <span className="sample-data-note">API history</span>
        </div>
      )}

      <div className="visualization-actions">
        <div>
          <h3>Shipment Analytics</h3>
          <p>Review recorded events and the selected shipment state.</p>
        </div>

        <button
          type="button"
          className="reset-button"
          onClick={handleReset}
          disabled={loading}
        >
          Reset Visualization
        </button>
      </div>

      <div className="shipment-metrics">
        <article className="metric-card">
          <span className="metric-label">TOTAL EVENTS</span>
          <strong className="metric-value">
            {loading ? "—" : events.length}
          </strong>
          <span className="metric-description">Events in current history</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">CRITICAL EVENTS</span>
          <strong className="metric-value metric-danger">
            {loading ? "—" : criticalCount}
          </strong>
          <span className="metric-description">High-severity events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">WARNING EVENTS</span>
          <strong className="metric-value metric-warning">
            {loading ? "—" : warningCount}
          </strong>
          <span className="metric-description">Medium-severity events</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">CURRENT SEVERITY</span>
          <strong
            className={`metric-value ${
              severity === "High"
                ? "metric-danger"
                : severity === "Medium"
                  ? "metric-warning"
                  : "metric-normal"
            }`}
          >
            {loading ? "—" : selectedEvent ? severity : "N/A"}
          </strong>
          <span className="metric-description">
            {selectedEvent?.time || "No event selected"}
          </span>
        </article>
      </div>

      {loading && (
        <div className="state-preview-empty" role="status">
          Loading events for {searchedShipment}...
        </div>
      )}

      {!loading && searchedShipment && !searchError && events.length === 0 && (
        <div className="state-preview-empty">
          <strong>No events found</strong>
          <p>
            No event history was returned. Verify the shipment ID and confirm
            that events exist in the backend database.
          </p>
        </div>
      )}

      {!loading && !searchError && hasEvents && (
        <>
          <div className="visualization-grid">
            <SensorChart currentIndex={index} />

            <ShipmentTimeline
              selectedEvent={selectedEvent}
              onSelectEvent={handleSelectEvent}
            />
          </div>

          <StateScrubber
            events={events}
            currentIndex={index}
            onChange={handleScrubberChange}
          />

          <div className="state-preview">
            <div className="state-preview-header">
              <div>
                <p className="section-eyebrow">EVENT INSPECTOR</p>
                <h3>Shipment State Preview</h3>
              </div>

              <span
                className={`preview-severity ${severity.toLowerCase()}`}
              >
                {severity} Severity
              </span>
            </div>

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
                <strong>{selectedEvent.state || "Unavailable"}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="visualization-footer">
        Audit Trail Logistics Ledger
        <span> • </span>
        Event history and shipment monitoring
      </footer>
    </section>
  );
}

export default VisualizationPanel;
