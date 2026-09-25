import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const sensorData = [
  { time: "08:00", temperature: 24 },
  { time: "10:00", temperature: 26 },
  { time: "12:00", temperature: 29 },
  { time: "14:00", temperature: 34 },
  { time: "16:00", temperature: 31 },
  { time: "18:00", temperature: 28 }
];

function SensorChart() {
  return (
    <div className="sensor-chart">
      <div className="sensor-chart-header">
        <h3>Temperature History</h3>
        <span>°C</span>
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SensorChart;