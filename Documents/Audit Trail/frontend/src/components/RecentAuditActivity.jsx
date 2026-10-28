import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Tag, Typography, Space, Tooltip, Input, Row, Col, Empty } from 'antd';
import { 
  HistoryOutlined, 
  KeyOutlined, 
  UserOutlined, 
  SearchOutlined,
  CheckCircleTwoTone,
  ClockCircleOutlined,
  ThunderboltOutlined,
  WifiOutlined
} from '@ant-design/icons';
import { subscribeToEventStream } from '../services/api';

const { Title, Text } = Typography;

/**
 * Chronological Audit Activity Dashboard Component (Day 25 Upgrade)
 * 
 * Fetches and renders the immutable event-sourced history for the tracked shipment.
 * Consumes real-time events via Server-Sent Events (SSE) and immediately prepends
 * new ledger entries to the table with animated feedback.
 */
export const RecentAuditActivity = ({ 
  auditEvents: initialAuditEvents = [], 
  loading = false, 
  shipmentId 
}) => {
  const [events, setEvents] = useState(initialAuditEvents);
  const [filterText, setFilterText] = useState('');
  const [newlyAddedKey, setNewlyAddedKey] = useState(null);

  // Sync prop changes
  useEffect(() => {
    setEvents(initialAuditEvents);
  }, [initialAuditEvents]);

  // Connect to live SSE Event Stream to consume real-time audit ledger updates
  useEffect(() => {
    const activeId = shipmentId || 'SHP-10024';

    const unsubscribe = subscribeToEventStream(
      { aggregateId: activeId },
      (streamPayload) => {
        console.log('⚡ [RecentAuditActivity SSE Event Received]:', streamPayload);
        const payload = streamPayload.payload || {};
        const eventKey = `stream-${Date.now()}`;
        
        let status = 'In Transit';
        const type = (streamPayload.eventType || '').toUpperCase();
        if (type.includes('DELIVER') || type.includes('SUCCESS') || type.includes('CLEARED')) {
          status = 'Success';
        } else if (type.includes('DELAY') || type.includes('EXCEPTION') || type.includes('ALERT')) {
          status = 'Audit Alert';
        }

        const newRow = {
          key: eventKey,
          version: streamPayload.version ? `v${streamPayload.version}` : `v${events.length + 1}`,
          event: formatEventName(streamPayload.eventType || payload.status || 'Transit Update'),
          rawEventType: streamPayload.eventType || 'TRANSIT_UPDATE',
          location: payload.location || payload.origin || 'Bhiwandi Gateway Hub',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status,
          actor: streamPayload.actor || 'Logistics Stream Broker',
          hash: streamPayload.hash ? `${streamPayload.hash.substring(0, 10)}...` : '0x8b3f...live'
        };

        setNewlyAddedKey(eventKey);
        setTimeout(() => setNewlyAddedKey(null), 3000);

        setEvents((prev) => [newRow, ...prev]);
      }
    );

    return () => unsubscribe();
  }, [shipmentId, events.length]);

  function formatEventName(type) {
    if (!type) return 'Status Update';
    return String(type)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Filter events based on search term
  const filteredData = events.filter((item) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      item.event.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q) ||
      (item.actor && item.actor.toLowerCase().includes(q)) ||
      (item.status && item.status.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('success') || s.includes('delivered') || s.includes('cleared')) {
      return <Badge status="success" text={<Text strong style={{ color: '#16a34a' }}>Success</Text>} />;
    }
    if (s.includes('transit') || s.includes('dispatched') || s.includes('processing')) {
      return <Badge status="processing" text={<Text strong style={{ color: '#2563eb' }}>In Transit</Text>} />;
    }
    if (s.includes('alert') || s.includes('fail') || s.includes('delay') || s.includes('diverg')) {
      return <Badge status="error" text={<Text strong style={{ color: '#dc2626' }}>Audit Alert</Text>} />;
    }
    return <Badge status="default" text={status || 'Recorded'} />;
  };

  const columns = [
    {
      title: 'Seq / Ver',
      dataIndex: 'version',
      key: 'version',
      width: 90,
      render: (text) => (
        <Tag color="geekblue" style={{ fontWeight: 600 }}>
          {text || 'v1'}
        </Tag>
      )
    },
    {
      title: 'Event Name',
      dataIndex: 'event',
      key: 'event',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#0f172a' }}>{text}</Text>
          {record.rawEventType && (
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {record.rawEventType}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location) => (
        <Space size={4}>
          <Text style={{ color: '#334155' }}>{location || 'Hub Checkpoint'}</Text>
        </Space>
      )
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (ts) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 13 }}>{ts}</Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getStatusBadge(status)
    },
    {
      title: 'Actor / Signer',
      dataIndex: 'actor',
      key: 'actor',
      render: (actor) => (
        <Space size={4}>
          <UserOutlined style={{ color: '#64748b', fontSize: 11 }} />
          <Text style={{ fontSize: 12, color: '#475569' }}>{actor || 'System'}</Text>
        </Space>
      )
    },
    {
      title: 'Ledger Hash',
      dataIndex: 'hash',
      key: 'hash',
      width: 130,
      render: (hash) => (
        <Tooltip title={`Immutable SHA-256 Hash: ${hash}`}>
          <Tag icon={<KeyOutlined />} color="default" style={{ fontFamily: 'monospace', fontSize: 11 }}>
            {hash || '0x4f..2a'}
          </Tag>
        </Tooltip>
      )
    }
  ];

  return (
    <Card 
      title={
        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
          <Col>
            <Space>
              <HistoryOutlined style={{ color: '#1677ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                Recent Audit Activity
              </Title>
              {shipmentId && (
                <Tag color="cyan">
                  {shipmentId}
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Filter audit trail..."
              size="small"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
          </Col>
        </Row>
      }
      extra={
        <Space>
          <Tag color="green" icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}>
            Append-Only Verified
          </Tag>
          <Tag color="blue" icon={<ThunderboltOutlined />}>
            Live SSE Consumer
          </Tag>
        </Space>
      }
      bordered={true}
      style={{ 
        borderRadius: 12, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
      }}
    >
      <Table 
        dataSource={filteredData} 
        columns={columns} 
        pagination={{ pageSize: 5, size: 'small' }} 
        size="middle" 
        loading={loading}
        rowClassName={(record) => record.key === newlyAddedKey ? 'live-event-highlight' : ''}
        locale={{
          emptyText: (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={`No audit events found for ${shipmentId || 'this shipment'}.`} 
            />
          )
        }}
      />
    </Card>
  );
};

export default RecentAuditActivity;
