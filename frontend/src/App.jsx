import React from "react";
import VisualizationPanel from "./components/visualization/VisualizationPanel";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Audit Trail Logistics Ledger</h1>
        <p>Shipment history and event visualization</p>
      </header>

      <main className="app-content">
        <VisualizationPanel />
      </main>
    </div>
  );
}

export default App;