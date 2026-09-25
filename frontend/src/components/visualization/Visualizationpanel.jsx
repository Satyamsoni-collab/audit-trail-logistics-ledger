import React from "react";
import SensorChart from "./SensorChart";

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

        <div className="chart-placeholder">
          <h3>Event Timeline</h3>
          <p>Shipment events will be displayed here.</p>
        </div>
      </div>
    </section>
  );
}

export default VisualizationPanel;