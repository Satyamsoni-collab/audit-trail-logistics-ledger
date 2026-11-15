import React, { useState } from 'react';

export const LogisticsAuditWidget = () => {
  const [logs] = useState([
    { id: 'TX-101', event: 'Dispatch Verified', status: 'Passed', time: '10:15 AM' },
    { id: 'TX-102', event: 'Ledger Hash Sync', status: 'Encrypted', time: '11:40 AM' },
    { id: 'TX-103', event: 'Node Checksum Validation', status: 'Passed', time: '02:20 PM' }
  ]);

  return (
    <div style={{ padding: '20px', background: '#0f172a', color: '#f8fafc', borderRadius: '12px', fontFamily: 'sans-serif', margin: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#38bdf8' }}>Audit Trail & Ledger Monitor</h3>
        <span style={{ fontSize: '12px', background: '#22c55e20', color: '#4ade80', padding: '4px 10px', borderRadius: '20px' }}>? Live Stream Active</span>
      </div>
      <table style={{ width: '100%', marginTop: '16px', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
            <th style={{ padding: '8px' }}>Log ID</th>
            <th style={{ padding: '8px' }}>Event Name</th>
            <th style={{ padding: '8px' }}>Ledger Status</th>
            <th style={{ padding: '8px' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((row) => (
            <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '10px 8px', color: '#cbd5e1' }}>{row.id}</td>
              <td style={{ padding: '10px 8px' }}>{row.event}</td>
              <td style={{ padding: '10px 8px' }}><span style={{ color: '#38bdf8', fontWeight: 600 }}>{row.status}</span></td>
              <td style={{ padding: '10px 8px', color: '#64748b' }}>{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogisticsAuditWidget;
