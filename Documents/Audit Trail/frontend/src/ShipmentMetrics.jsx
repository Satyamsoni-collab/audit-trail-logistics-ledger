import React from 'react';

export const ShipmentMetrics = () => {
  const metrics = [
    { label: 'Total Shipments', count: 142, color: '#38bdf8' },
    { label: 'In Transit', count: 28, color: '#f59e0b' },
    { label: 'Delivered Today', count: 110, color: '#22c55e' },
    { label: 'Audit Alerts', count: 4, color: '#ef4444' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', margin: '16px 0' }}>
      {metrics.map((item, idx) => (
        <div key={idx} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: item.color, marginTop: '6px' }}>{item.count}</div>
        </div>
      ))}
    </div>
  );
};

export default ShipmentMetrics;
