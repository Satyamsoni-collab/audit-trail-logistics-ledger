import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from "recharts";

const sensorData = [
  { time: "08:00", temperature: 24 },
  { time: "10:00", temperature: 26 },
  { time: "12:00", temperature: 29 },
  { time: "14:00", temperature: 34 },
  { time: "16:00", temperature: 31 },
  { time: "18:00", temperature: 28 }
];

const scrubberTimes = [
  "08:00",
  "10:30",
  "14:00",
  "18:00"
];

function SensorChart({ currentIndex = 0 }) {
  const selectedTime = scrubberTimes[currentIndex];

  const selectedPoint = sensorData.find(
    (item) => item.time === selectedTime
  );

  const currentTemperature = selectedPoint?.temperature ?? 0;

  let sensorStatus = "Normal";

  if (currentTemperature >= 33) {
    sensorStatus = "High Temperature";
  } else if (currentTemperature >= 30) {
    sensorStatus = "Warning";
  }

  return (
    <div className="sensor-chart">
      <div className="sensor-chart-header">
        <div>
          <h3>Temperature History</h3>
          <p className="chart-subtitle">
            Sensor reading at selected shipment state
          </p>
        </div>

        <span>°C</span>

        <span className="sensor-status">
          {sensorStatus}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={sensorData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="time" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />

          {selectedPoint && (
            <ReferenceDot
              x={selectedPoint.time}
              y={selectedPoint.temperature}
              r={7}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Temperature Status Legend */}
      <div className="temperature-legend">
        <span className="legend-title">
          Temperature Status
        </span>

        <span className="legend-item">
          <span className="legend-dot normal"></span>
          Normal (&lt; 30°C)
        </span>

        <span className="legend-item">
          <span className="legend-dot warning"></span>
          Warning (30–32°C)
        </span>

        <span className="legend-item">
          <span className="legend-dot high"></span>
          High (≥ 33°C)
        </span>
      </div>

      <div className="sensor-reading">
        <span>Selected Time</span>
        <strong>{selectedPoint?.time || "--"}</strong>

        <span>Temperature</span>
        <strong>
          {selectedPoint
            ? `${selectedPoint.temperature} °C`
            : "--"}
        </strong>
      </div>
    </div>
  );
}

export default SensorChart;