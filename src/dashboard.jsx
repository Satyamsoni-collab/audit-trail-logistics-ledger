import React from 'react';

function Dashboard() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Logistics Ledger Dashboard</h2>
      <p>Welcome to Week 2 development tasks!</p>
    </div>
  );
}

export default Dashboard;
import React from 'react';

function Dashboard() {
  // Sample metrics data
  const stats = [
    { title: 'Total Shipments', count: 124, color: '#2563eb' },
    { title: 'Pending Audits', count: 18, color: '#d97706' },
    { title: 'Flagged Issues', count: 3, color: '#dc2626' },
    { title: 'Verified Logs', count: 103, color: '#16a34a' }
  ];

  // Sample recent activity logs
  const recentActivities = [
    { id: 'LOG-1001', event: 'Shipment Created', user: 'Admin', time: '10 mins ago' },
    { id: 'LOG-1002', event: 'Audit Verified', user: 'Inspector', time: '25 mins ago' },
    { id: 'LOG-1003', event: 'Status Updated', user: 'Logistics Mgr', time: '1 hour ago' }
  ];

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '8px' }}>Logistics Ledger Dashboard</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>Overview of audit trail and system activity.</p>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {stats.map((stat, index) => (
          <div 
            key={index} 
            style={{ 
              flex: '1', 
              minWidth: '180px', 
              padding: '16px', 
              borderRadius: '8px', 
              backgroundColor: '#f8fafc', 
              borderLeft: `4px solid ${stat.color}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>{stat.title}</h4>
            <h2 style={{ margin: 0, color: '#0f172a' }}>{stat.count}</h2>
          </div>
        ))}
      </div>

      {/* Recent Activity Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Recent Audit Activities</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '8px' }}>Log ID</th>
              <th style={{ padding: '8px' }}>Event</th>
              <th style={{ padding: '8px' }}>User</th>
              <th style={{ padding: '8px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {recentActivities.map((act) => (
              <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 8px', fontWeight: '600' }}>{act.id}</td>
                <td style={{ padding: '10px 8px' }}>{act.event}</td>
                <td style={{ padding: '10px 8px' }}>{act.user}</td>
                <td style={{ padding: '10px 8px', color: '#64748b' }}>{act.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;