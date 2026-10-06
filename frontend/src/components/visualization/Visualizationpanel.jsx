
import React, { useState } from "react";
import SensorChart from "./SensorChart";
import ShipmentTimeline from "./ShipmentTimeline";
import StateScrubber from "./StateScrubber";

const shipmentStates = [
  { type: "CONTAINER_CREATED", time: "08:00" },
  { type: "LOADED_ON_SHIP", time: "10:30" },
  { type: "TEMPERATURE_SPIKE", time: "14:00" },
  { type: "ARRIVED_AT_PORT", time: "18:00" }
];

function VisualizationPanel() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shipmentId, setShipmentId] = useState("");
  const [searchedShipment, setSearchedShipment] = useState("");

  const handleEventSelect = (event) => {
    setSelectedEvent(event);

    const index = shipmentStates.findIndex(
      (item) => item.type === event.type
    );

    if (index !== -1) {
      setCurrentIndex(index);
    }
  };

  const handleScrubberChange = (index) => {
    setCurrentIndex(index);
    setSelectedEvent(null);
  };

  const handleSearch = () => {
    if (!shipmentId.trim()) return;

    setSearchedShipment(shipmentId.trim());
    setSelectedEvent(null);
    setCurrentIndex(0);
  };
  const handleReset = () => {
  setSelectedEvent(null);
  setCurrentIndex(0);
  setShipmentId("");
  setSearchedShipment("");
};

  return (
    <section className="visualization-panel">
      <div className="visualization-header">
        <div>
          <h2>Shipment Visualization</h2>
          <p>Monitor shipment events and sensor history</p>
        </div>
        <span className="visualization-status">
          Visualization Ready
        </span>
      </div>

      <div className="shipment-search">
        <input
          type="text"
          placeholder="Enter Shipment ID"
          value={shipmentId}
          onChange={(e) => setShipmentId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      <div className="visualization-actions">
  <button onClick={handleReset} className="reset-button">
    Reset Visualization
  </button>
</div>

      {searchedShipment && (
        <div className="searched-shipment">
          Showing shipment: <strong>{searchedShipment}</strong>
        </div>
      )}

      <div className="visualization-grid">
        <SensorChart currentIndex={currentIndex} />

        <ShipmentTimeline
          selectedEvent={selectedEvent}
          onSelectEvent={handleEventSelect}
        />
      </div>

      <StateScrubber
        currentIndex={currentIndex}
        onChange={handleScrubberChange}
      />

      <div className="state-preview">
        <h3>Shipment State Preview</h3>

        {selectedEvent ? (
          <>
            <div className="state-row">
              <span>Selected Event</span>
              <strong>{selectedEvent.type}</strong>
            </div>
            <div className="state-row">
  <span>Severity</span>
  <strong>
    {selectedEvent.type === "TEMPERATURE_SPIKE"
      ? "High"
      : selectedEvent.type === "LOADED_ON_SHIP"
      ? "Medium"
      : "Normal"}
  </strong>
</div>

            <div className="state-row">
              <span>Event Time</span>
              <strong>{selectedEvent.time}</strong>
            </div>

            <div className="state-row">
              <span>Reconstructed State</span>
              <strong>{selectedEvent.state}</strong>
            </div>
          </>
        ) : (
          <p>
            Select an event to view its reconstructed state.
          </p>
        )}
      </div>
    </section>
  );
}

export default VisualizationPanel;
