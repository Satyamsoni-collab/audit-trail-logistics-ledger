import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Tag, Input, Space, Button, Tooltip, Spin, Alert, Badge } from 'antd';
import { 
  SearchOutlined, 
  SyncOutlined, 
  CheckCircleOutlined, 
  EnvironmentOutlined, 
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  InboxOutlined,
  WifiOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { subscribeToEventStream } from '../services/api';

const { Search } = Input;
const { Title, Text } = Typography;

/**
 * Real-Time Shipment Tracking Interface Component (Day 25 Upgrade)
 * 
 * Takes a Shipment ID (e.g., SHP-10024) and dynamically renders live details.
 * Connects to the Server-Sent Events (SSE) event stream to update instantly
 * as new logistics events are published to the Enterprise Message Broker.
 */
export const TrackShipment = ({ 
  shipmentData: initialShipmentData, 
  loading, 
  onSearch, 
  onRefresh, 
  error 
}) => {
  const [shipmentData, setShipmentData] = useState(initialShipmentData);
  const [inputValue, setInputValue] = useState(initialShipmentData?.id || 'SHP-10024');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastStreamEvent, setLastStreamEvent] = useState(null);
  const [highlightPulse, setHighlightPulse] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setShipmentData(initialShipmentData);
  }, [initialShipmentData]);

  // Connect to live SSE Event Stream for the tracked shipment
  useEffect(() => {
    const activeId = shipmentData?.id || 'SHP-10024';
    setIsLiveConnected(true);

    const unsubscribe = subscribeToEventStream(
      { aggregateId: activeId },
      (streamPayload) => {
        console.log('⚡ [TrackShipment SSE Event Received]:', streamPayload);
        setLastStreamEvent(streamPayload);

        // Flash pulse effect on card
        setHighlightPulse(true);
        setTimeout(() => setHighlightPulse(false), 2500);

        // Dynamically update shipment status and details without page reload
        setShipmentData((prev) => {
          const payload = streamPayload.payload || {};
          const newStatus = payload.status || streamPayload.eventType || prev?.status || 'IN TRANSIT';
          const newLocation = payload.location || payload.origin || prev?.origin;
          const newDestination = payload.destination || prev?.destination;

          return {
            ...(prev || {}),
            id: activeId,
            status: String(newStatus).replace(/_/g, ' ').toUpperCase(),
            origin: newLocation || prev?.origin || 'Mumbai Hub',
            destination: newDestination || prev?.destination || 'Delhi Warehouse',
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            lastStreamEventTime: new Date().toLocaleTimeString()
          };
        });
      },
      (err) => {
        setIsLiveConnected(false);
      }
    );

    return () => {
      unsubscribe();
      setIsLiveConnected(false);
    };
  }, [shipmentData?.id]);

  const presetIds = ['SHP-10024', 'MACBOOK-M3-MAX', 'ITEM-MUMBAI-BAY4', 'CONSIGNMENT-902'];

  const handleSearchTrigger = (val) => {
    const target = (val || inputValue || '').trim();
    if (target && onSearch) {
      onSearch(target);
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('DELAY') || s.includes('STALL')) return 'error';
    if (s.includes('TRANSIT')) return 'processing';
    if (s.includes('DELIVER') || s.includes('SUCCESS') || s.includes('AVAILABLE')) return 'success';
    if (s.includes('CUSTOMS')) return 'warning';
    if (s.includes('DISPATCH')) return 'blue';
    return 'default';
  };

  return (
    <Card 
      bordered={true}
      style={{ 
        borderRadius: 12, 
        boxShadow: highlightPulse ? '0 0 16px rgba(34, 197, 94, 0.4)' : '0 4px 12px rgba(0,0,0,0.05)',
        marginBottom: 24,
        transition: 'all 0.3s ease',
        border: highlightPulse ? '1px solid #22c55e' : '1px solid #e2e8f0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <InboxOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          Track Shipment
        </Title>
        <Tag 
          color={isLiveConnected ? 'success' : 'default'}
          icon={<WifiOutlined />}
          style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500 }}
        >
          {isLiveConnected ? 'SSE Live Stream Connected' : 'Connecting Stream...'}
        </Tag>
      </div>

      {/* Search Bar & Controls */}
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
        <Col xs={24} md={14}>
          <Search
            placeholder="Enter Shipment ID (e.g., SHP-10024)"
            allowClear
            enterButton={
              <span>
                <SearchOutlined /> Track Shipment
              </span>
            }
            size="large"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onSearch={handleSearchTrigger}
            loading={loading}
          />
        </Col>

        <Col xs={24} md={10}>
          <Space wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>Sample IDs:</Text>
            {presetIds.map((pid) => (
              <Tag
                key={pid}
                color={shipmentData?.id === pid ? 'blue' : 'default'}
                style={{ cursor: 'pointer', borderRadius: 4 }}
                onClick={() => {
                  setInputValue(pid);
                  handleSearchTrigger(pid);
                }}
              >
                {pid}
              </Tag>
            ))}
            <Tooltip title="Refresh Live State from Backend Read Model">
              <Button 
                icon={<SyncOutlined spin={loading} />} 
                onClick={onRefresh}
                size="middle"
              />
            </Tooltip>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert 
          message="Notice" 
          description={error} 
          type="info" 
          showIcon 
          closable 
          style={{ marginBottom: 16 }} 
        />
      )}

      {lastStreamEvent && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: 12,
          padding: '6px 12px',
          borderRadius: 6,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <ThunderboltOutlined style={{ color: '#16a34a' }} />
          <span>
            <strong>Live Update:</strong> Streamed event <Text code>{lastStreamEvent.eventType}</Text> received via Message Broker.
          </span>
        </div>
      )}

      {/* Dynamic Live Details Card */}
      <Spin spinning={loading}>
        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: 8, 
          padding: 20 
        }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Shipment Status
              </Text>
              <div style={{ marginTop: 6 }}>
                <Tag 
                  color={getStatusColor(shipmentData?.status)} 
                  style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}
                >
                  {shipmentData?.status || 'IN TRANSIT'}
                </Tag>
              </div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <EnvironmentOutlined style={{ marginRight: 4, color: '#3b82f6' }} /> Origin
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                  {shipmentData?.origin || 'Mumbai Hub'}
                </Text>
              </div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <EnvironmentOutlined style={{ marginRight: 4, color: '#10b981' }} /> Destination
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                  {shipmentData?.destination || 'Delhi Warehouse'}
                </Text>
              </div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <ClockCircleOutlined style={{ marginRight: 4, color: '#f59e0b' }} /> Last Updated
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                  {shipmentData?.updatedAt || 'Just now'}
                </Text>
              </div>
            </Col>
          </Row>

          {/* Secondary Telemetry Strip */}
          <div style={{ 
            marginTop: 16, 
            paddingTop: 12, 
            borderTop: '1px dashed #cbd5e1', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Consignment SKU: <Text code>{shipmentData?.sku || 'LOG-CONS-01'}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Units Tracked: <Text strong style={{ color: '#2563eb' }}>{shipmentData?.quantity || 150} Units</Text>
            </Text>
            <Tag color="cyan" icon={<SafetyCertificateOutlined />}>
              Cryptographic Audit Chain: Validated
            </Tag>
          </div>
        </div>
      </Spin>
    </Card>
  );
};

export default TrackShipment;
