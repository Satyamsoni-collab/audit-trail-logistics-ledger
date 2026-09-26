import React from "react";
import SensorChart from "./SensorChart";
import ShipmentTimeline from "./ShipmentTimeline";

function VisualizationPanel() {
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

        <ShipmentTimeline />
      </div>
    </section>
  );
}

export default VisualizationPanel;