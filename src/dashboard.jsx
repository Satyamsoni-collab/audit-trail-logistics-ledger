import React, { useState, useEffect } from 'react';
import AddLogModal from './AddLogModal';

function Dashboard() {
  const [filter, setFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const defaultMockLogs = [
    { id: 'LOG-8001', trackingNo: 'TRK-9901', event: 'Package In Transit', status: 'In Progress', timestamp: '2026-10-18 10:30', details: 'Dispatch from Central Hub. Carrier and seal verified.' },
    { id: 'LOG-8002', trackingNo: 'TRK-9902', event: 'Customs Cleared', status: 'Completed', timestamp: '2026-10-18 11:15', details: 'All documents verified and cleared by port authority.' },
    { id: 'LOG-8003', trackingNo: 'TRK-9903', event: 'Weight Mismatch', status: 'Flagged', timestamp: '2026-10-18 12:00', details: 'Recorded weight differs from manifested weight by 4.2kg.' },
    { id: 'LOG-8004', trackingNo: 'TRK-9904', event: 'Out for Delivery', status: 'In Progress', timestamp: '2026-10-18 14:20', details: 'Out with local delivery agent for final drop-off.' }
  ];

  const [logs, setLogs] = useState(() => {
    const savedLogs = localStorage.getItem('audit_logs');
    if (savedLogs) {
      try {
        return JSON.parse(savedLogs);
      } catch (e) {
        console.error("Failed to parse logs from localStorage", e);
      }
    }
    return defaultMockLogs;
  });

  useEffect(() => {
    localStorage.setItem('audit_logs', JSON.stringify(logs));
  }, [logs]);

  const [newLog, setNewLog] = useState({
    id: `LOG-${Math.floor(8005 + Math.random() * 1000)}`,
    trackingNo: '',
    event: '',
    status: 'In Progress',
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    details: ''
  });

  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLog.trackingNo || !newLog.event) return;
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    setIsAddModalOpen(false);
    setNewLog({
      id: `LOG-${Math.floor(8005 + Math.random() * 1000)}`,
      trackingNo: '',
      event: '',
      status: 'In Progress',
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      details: ''
    });
  };

  const handleDeleteLog = (id) => {
    if (window.confirm("Are you sure you want to delete this audit log?")) {
      const updatedLogs = logs.filter(log => log.id !== id);
      setLogs(updatedLogs);
      setSelectedLog(null);
    }
  };

  // Reset to default data feature
  const handleResetData = () => {
    if (window.confirm("Reset all logs to default sample data?")) {
      setLogs(defaultMockLogs);
      localStorage.setItem('audit_logs', JSON.stringify(defaultMockLogs));
    }
  };

  const exportToCSV = () => {
    const headers = ['Log ID', 'Tracking No', 'Event', 'Status', 'Timestamp', 'Details'];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => 
        `"${log.id}","${log.trackingNo}","${log.event}","${log.status}","${log.timestamp}","${log.details}"`
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'audit_logs_report.csv');
    a.click();
  };

  const stats = [
    { title: 'Total Shipments', count: logs.length + 120, color: '#2563eb' },
    { title: 'Pending Audits', count: logs.filter(l => l.status === 'In Progress').length, color: '#d97706' },
    { title: 'Flagged Issues', count: logs.filter(l => l.status === 'Flagged').length, color: '#dc2626' },
    { title: 'Verified Logs', count: logs.filter(l => l.status === 'Completed').length, color: '#16a34a' }
  ];

  const filteredLogs = logs.filter(log => {
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
    <div style={{ padding: '24px', fontFamily: 'sans-serif', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0' }}>Logistics Ledger Dashboard</h2>
          <p style={{ color: '#666', margin: 0 }}>Overview of audit trail, metrics, and live log management.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleResetData}
            style={{
              padding: '10px 14px',
              backgroundColor: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            🔄 Reset Data
          </button>
          <button 
            onClick={exportToCSV}
            style={{
              padding: '10px 16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            📥 Export CSV
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            + Add New Log
          </button>
        </div>
      </div>

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

      {/* Audit Table Section */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                <tr 
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
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

      {/* Detail Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Log Details: {selectedLog.id}</h3>
            <p style={{ margin: '8px 0' }}><strong>Tracking No:</strong> {selectedLog.trackingNo}</p>
            <p style={{ margin: '8px 0' }}><strong>Event:</strong> {selectedLog.event}</p>
            <p style={{ margin: '8px 0' }}><strong>Status:</strong> {selectedLog.status}</p>
            <p style={{ margin: '8px 0' }}><strong>Timestamp:</strong> {selectedLog.timestamp}</p>
            <p style={{ margin: '8px 0' }}><strong>Description:</strong> {selectedLog.details}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button 
                onClick={() => handleDeleteLog(selectedLog.id)}
                style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Delete Log
              </button>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Log Modal Component */}
      <AddLogModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAddLog={handleAddLog} 
        newLog={newLog} 
        setNewLog={setNewLog} 
      />
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