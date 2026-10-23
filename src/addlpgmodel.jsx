import React from 'react';

function AddLogModal({ isOpen, onClose, onAddLog, newLog, setNewLog }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>Add New Audit Log</h3>
        <form onSubmit={onAddLog}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#475569' }}>Tracking Number</label>
            <input 
              type="text" 
              required
              placeholder="e.g. TRK-9995"
              value={newLog.trackingNo}
              onChange={(e) => setNewLog({ ...newLog, trackingNo: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#475569' }}>Event Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Hub Arrival"
              value={newLog.event}
              onChange={(e) => setNewLog({ ...newLog, event: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#475569' }}>Status</label>
            <select 
              value={newLog.status}
              onChange={(e) => setNewLog({ ...newLog, status: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff' }}
            >
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Flagged">Flagged</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#475569' }}>Details / Remarks</label>
            <textarea 
              rows="3"
              placeholder="Enter audit details..."
              value={newLog.details}
              onChange={(e) => setNewLog({ ...newLog, details: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
            >
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddLogModal;
import React, { useState } from 'react';
import AddLogModal from './AddLogModal';

function Dashboard() {
  const [filter, setFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [logs, setLogs] = useState([
    { id: 'LOG-8001', trackingNo: 'TRK-9901', event: 'Package In Transit', status: 'In Progress', timestamp: '2026-10-18 10:30', details: 'Dispatch from Central Hub. Carrier and seal verified.' },
    { id: 'LOG-8002', trackingNo: 'TRK-9902', event: 'Customs Cleared', status: 'Completed', timestamp: '2026-10-18 11:15', details: 'All documents verified and cleared by port authority.' },
    { id: 'LOG-8003', trackingNo: 'TRK-9903', event: 'Weight Mismatch', status: 'Flagged', timestamp: '2026-10-18 12:00', details: 'Recorded weight differs from manifested weight by 4.2kg.' },
    { id: 'LOG-8004', trackingNo: 'TRK-9904', event: 'Out for Delivery', status: 'In Progress', timestamp: '2026-10-18 14:20', details: 'Out with local delivery agent for final drop-off.' }
  ]);

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
    setLogs([newLog, ...logs]);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0' }}>Logistics Ledger Dashboard</h2>
          <p style={{ color: '#666', margin: 0 }}>Overview of audit trail, metrics, and live log management.</p>
        </div>
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
            <button 
              onClick={() => setSelectedLog(null)}
              style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Refactored Add Log Modal Component */}
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