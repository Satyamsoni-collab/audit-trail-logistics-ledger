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
import React, { useState } from 'react';

const mockLogs = [
  { id: 'LOG-8001', trackingNo: 'TRK-9901', event: 'Package In Transit', status: 'In Progress', timestamp: '2026-10-18 10:30' },
  { id: 'LOG-8002', trackingNo: 'TRK-9902', event: 'Customs Cleared', status: 'Completed', timestamp: '2026-10-18 11:15' },
  { id: 'LOG-8003', trackingNo: 'TRK-9903', event: 'Weight Mismatch', status: 'Flagged', timestamp: '2026-10-18 12:00' },
  { id: 'LOG-8004', trackingNo: 'TRK-9904', event: 'Out for Delivery', status: 'In Progress', timestamp: '2026-10-18 14:20' }
];

function AuditTable() {
  const [filter, setFilter] = useState('');

  const filteredLogs = mockLogs.filter(log => 
    log.trackingNo.toLowerCase().includes(filter.toLowerCase()) ||
    log.event.toLowerCase().includes(filter.toLowerCase()) ||
    log.status.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed': return { backgroundColor: '#dcfce7', color: '#15803d' };
      case 'Flagged': return { backgroundColor: '#fee2e2', color: '#b91c1c' };
      default: return { backgroundColor: '#e0f2fe', color: '#0369a1' };
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Logistics Audit Logs</h3>
        <input 
          type="text" 
          placeholder="Filter logs by keyword..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '250px' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '10px' }}>Log ID</th>
            <th style={{ padding: '10px' }}>Tracking No</th>
            <th style={{ padding: '10px' }}>Event</th>
            <th style={{ padding: '10px' }}>Status</th>
            <th style={{ padding: '10px' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log) => (
            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.id}</td>
              <td style={{ padding: '10px' }}>{log.trackingNo}</td>
              <td style={{ padding: '10px' }}>{log.event}</td>
              <td style={{ padding: '10px' }}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  ...getStatusStyle(log.status)
                }}>
                  {log.status}
                </span>
              </td>
              <td style={{ padding: '10px', color: '#64748b' }}>{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AuditTable;
import React from 'react';
import AuditTable from './AuditTable'; // <-- Import added

function Dashboard() {
  // ... (Aapka existing stats aur dashboard logic) ...

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2>Logistics Ledger Dashboard</h2>
      {/* ... (Existing Stats Cards) ... */}

      {/* Naya Audit Table Component */}
      <AuditTable />
    </div>
  );
}

export default Dashboard;import React from 'react';
import AuditTable from './AuditTable'; // <-- Import added

function Dashboard() {
  // ... (Aapka existing stats aur dashboard logic) ...

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h2>Logistics Ledger Dashboard</h2>
      {/* ... (Existing Stats Cards) ... */}

      {/* Naya Audit Table Component */}
      <AuditTable />
    </div>
  );
}

export default Dashboard;
import React, { useState } from 'react';

const mockLogs = [
  { id: 'LOG-8001', trackingNo: 'TRK-9901', event: 'Package In Transit', status: 'In Progress', timestamp: '2026-10-18 10:30' },
  { id: 'LOG-8002', trackingNo: 'TRK-9902', event: 'Customs Cleared', status: 'Completed', timestamp: '2026-10-18 11:15' },
  { id: 'LOG-8003', trackingNo: 'TRK-9903', event: 'Weight Mismatch', status: 'Flagged', timestamp: '2026-10-18 12:00' },
  { id: 'LOG-8004', trackingNo: 'TRK-9904', event: 'Out for Delivery', status: 'In Progress', timestamp: '2026-10-18 14:20' }
];

function AuditTable() {
  const [filter, setFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = 
      log.trackingNo.toLowerCase().includes(filter.toLowerCase()) ||
      log.event.toLowerCase().includes(filter.toLowerCase()) ||
      log.id.toLowerCase().includes(filter.toLowerCase());

    const matchesStatus = selectedStatus === 'All' || log.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed': return { backgroundColor: '#dcfce7', color: '#15803d' };
      case 'Flagged': return { backgroundColor: '#fee2e2', color: '#b91c1c' };
      default: return { backgroundColor: '#e0f2fe', color: '#0369a1' };
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0 }}>Logistics Audit Logs</h3>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Completed', 'Flagged', 'In Progress'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: selectedStatus === status ? '#0284c7' : '#f8fafc',
                color: selectedStatus === status ? '#fff' : '#334155',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        <input 
          type="text" 
          placeholder="Search by ID, Tracking..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '220px' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '10px' }}>Log ID</th>
            <th style={{ padding: '10px' }}>Tracking No</th>
            <th style={{ padding: '10px' }}>Event</th>
            <th style={{ padding: '10px' }}>Status</th>
            <th style={{ padding: '10px' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.id}</td>
                <td style={{ padding: '10px' }}>{log.trackingNo}</td>
                <td style={{ padding: '10px' }}>{log.event}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    ...getStatusStyle(log.status)
                  }}>
                    {log.status}
                  </span>
                </td>
                <td style={{ padding: '10px', color: '#64748b' }}>{log.timestamp}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                No matching audit logs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AuditTable;
