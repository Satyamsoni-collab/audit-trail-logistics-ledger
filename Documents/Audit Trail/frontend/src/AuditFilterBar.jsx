import React, { useState } from 'react';

export const AuditFilterBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b', margin: '14px 0' }}>
      <input
        type="text"
        placeholder="Filter by Tracking ID or Ledger Hash..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '13px' }}
      />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '13px' }}
      >
        <option value="ALL">All Statuses</option>
        <option value="PASSED">Passed</option>
        <option value="ENCRYPTED">Encrypted</option>
        <option value="ALERT">Audit Alert</option>
      </select>
    </div>
  );
};

export default AuditFilterBar;
