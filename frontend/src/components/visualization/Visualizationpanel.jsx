import React from "react";

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
        <div className="chart-placeholder">
          <h3>Temperature History</h3>
          <p>Sensor chart will be displayed here.</p>
        </div>

        <div className="chart-placeholder">
          <h3>Event Timeline</h3>
          <p>Shipment events will be displayed here.</p>
        </div>
      </div>
    </section>
  );
}

export default VisualizationPanel;