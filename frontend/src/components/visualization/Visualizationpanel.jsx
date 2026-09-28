import React, { useState } from "react";
import SensorChart from "./SensorChart";
import ShipmentTimeline from "./ShipmentTimeline";

function VisualizationPanel() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <section className="visualization-panel">
      <div className="visualization-header">
        <div>
          <h2>Shipment Visualization</h2>
          <p>Monitor historical shipment and sensor information</p>
        </div>

        <span className="visualization-status">
          Visualization Ready
        </span>
      </div>

      <div className="visualization-grid">
        <SensorChart />

        <ShipmentTimeline
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
        />
      </div>

      <div className="state-preview">
        <h3>Shipment State Preview</h3>

        {selectedEvent ? (
          <>
            <div className="state-row">
              <span>Selected Event</span>
              <strong>{selectedEvent.type}</strong>
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
          <p>Select an event from the timeline to view its state.</p>
        )}
      </div>
    </section>
  );
}

export default VisualizationPanel;