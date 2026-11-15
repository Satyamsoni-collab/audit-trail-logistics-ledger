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
              rows={3}
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
