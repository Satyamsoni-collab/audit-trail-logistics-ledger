import React from 'react';

export const DeliveryTimelineTracker = () => {
  const steps = [
    { title: 'Order Dispatched', done: true, time: '09:30 AM' },
    { title: 'Checkpoint Verified', done: true, time: '12:15 PM' },
    { title: 'In Transit to Hub', done: true, time: '03:45 PM' },
    { title: 'Out for Final Delivery', done: false, time: 'Pending' }
  ];

  return (
    <div style={{ background: '#1e293b', padding: '18px', borderRadius: '10px', color: '#e2e8f0', marginTop: '15px' }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8' }}>Delivery Progress & Chain of Custody</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ flex: 1, padding: '10px', background: '#0f172a', borderRadius: '8px', borderLeft: step.done ? '4px solid #22c55e' : '4px solid #64748b' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: step.done ? '#4ade80' : '#94a3b8' }}>{step.title}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{step.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryTimelineTracker;
