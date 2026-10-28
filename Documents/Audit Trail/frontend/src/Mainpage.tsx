import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, 
  Menu, 
  Breadcrumb, 
  Typography, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Button, 
  message, 
  Modal, 
  InputNumber, 
  Input, 
  Space,
  Tag
} from 'antd';
import { 
  DashboardOutlined, 
  ShoppingCartOutlined, 
  BarChartOutlined, 
  PlusCircleOutlined,
  SendOutlined,
  ThunderboltFilled,
  WifiOutlined,
  ThunderboltOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

import TrackShipment from './components/TrackShipment.jsx';
import RecentAuditActivity from './components/RecentAuditActivity.jsx';
import AIDiagnosticsWidget from './components/AIDiagnosticsWidget.jsx';
import { 
  getShipmentReadModel, 
  getShipmentAuditHistory, 
  getRealtimeMetrics, 
  dispatchStockMovement,
  simulateLogisticsEvent
} from './services/api.js';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

const MainPage: React.FC = () => {
  const [searchedId, setSearchedId] = useState<string>('SHP-10024');
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalItemsTracked: 142,
    totalUnitsInStock: 8520,
    totalMovementsCount: 384,
    outOfStockItemsCount: 2
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Command Dispatch Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [dispatchQty, setDispatchQty] = useState<number>(25);
  const [dispatchLocation, setDispatchLocation] = useState<string>('Delhi Gateway Hub');
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Fetch live shipment data and chronological audit trail
  const loadShipmentData = useCallback(async (id: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const [readModel, history, realTimeStats] = await Promise.all([
        getShipmentReadModel(id),
        getShipmentAuditHistory(id),
        getRealtimeMetrics()
      ]);

      setShipmentData(readModel);
      setAuditEvents(history);
      if (realTimeStats) {
        setMetrics(realTimeStats);
      }
    } catch (err: any) {
      console.warn('API fetch notice:', err.message);
      setErrorMsg(err.message || 'Error communicating with Audit Trail API');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadShipmentData(searchedId);
  }, [searchedId, loadShipmentData]);

  const handleSearch = (id: string) => {
    setSearchedId(id);
  };

  const handleRefresh = () => {
    loadShipmentData(searchedId);
    message.success(`Refreshed live ledger state for ${searchedId}`);
  };

  // Dispatches a live CQRS Write Command to the backend
  const handleDispatchMovement = async () => {
    setDispatching(true);
    try {
      await dispatchStockMovement({
        aggregateId: searchedId,
        quantityDelta: dispatchQty,
        location: dispatchLocation,
        reason: 'Shipment dispatched to downstream destination'
      });
      message.success(`CQRS Write Command dispatched successfully for ${searchedId}`);
      setModalVisible(false);
      // Wait briefly for EventBus & Projectors to commit state, then refresh
      setTimeout(() => loadShipmentData(searchedId), 500);
    } catch (err: any) {
      message.error(err.message || 'Failed to dispatch write command');
    } finally {
      setDispatching(false);
    }
  };

  // Simulates a live logistics event via SSE / Message Broker
  const handleSimulateLiveEvent = async () => {
    setSimulating(true);
    try {
      const checkpoints = [
        'Surat Logistics Park, Gujarat',
        'Ahmedabad Ring Road Depot',
        'Jaipur Highway Checkpoint',
        'Gurugram Express Gateway',
        'Delhi Central Warehouse'
      ];
      const randomLocation = checkpoints[Math.floor(Math.random() * checkpoints.length)];

      await simulateLogisticsEvent({
        aggregateId: searchedId,
        eventType: 'TRANSIT_UPDATE',
        status: 'IN TRANSIT',
        location: randomLocation,
        actor: 'broker-relay-agent',
        notes: `Live checkpoint scanned at ${randomLocation}`
      });

      message.success(`Live event published! Check 'Track Shipment' & 'Audit Activity' updates.`);
    } catch (err: any) {
      message.error('Failed to publish simulated stream event: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Sider width={220} theme="dark" style={{ background: '#0f172a' }}>
        <div style={{ 
          height: '40px', 
          margin: '16px', 
          background: 'linear-gradient(135deg, #2563eb, #38bdf8)', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }}>
          AUDIT LEDGER
        </div>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" style={{ background: '#0f172a' }}>
          <Menu.Item key="1" icon={<DashboardOutlined />}>Day 25 Dashboard</Menu.Item>
          <Menu.Item key="2" icon={<ShoppingCartOutlined />}>Live Tracking</Menu.Item>
          <Menu.Item key="3" icon={<BarChartOutlined />}>Audit Ledger</Menu.Item>
        </Menu>
      </Sider>

      <Layout className="site-layout" style={{ background: '#f8fafc' }}>
        <Header style={{ 
          background: '#ffffff', 
          padding: '0 32px', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
              Audit Trail: Event-Sourced Logistics Ledger
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Tag color="geekblue">Day 25: Live Streaming & AI</Tag>
              <Tag color="green" icon={<WifiOutlined />}>SSE Stream: Active</Tag>
              <Tag color="cyan" icon={<DatabaseOutlined />}>Redis Query Cache: Enabled</Tag>
            </div>
          </div>

          <Space wrap>
            <Button
              type="dashed"
              icon={<ThunderboltOutlined />}
              loading={simulating}
              onClick={handleSimulateLiveEvent}
              style={{ borderColor: '#2563eb', color: '#2563eb' }}
            >
              Simulate Live Event
            </Button>

            <Button 
              type="primary" 
              icon={<PlusCircleOutlined />} 
              style={{ background: '#2563eb', borderRadius: 6 }}
              onClick={() => setModalVisible(true)}
            >
              Append Transit Event
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: '0 32px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>Live Streaming</Breadcrumb.Item>
            <Breadcrumb.Item>AI Diagnostics & Redis Caching</Breadcrumb.Item>
          </Breadcrumb>

          {/* Top KPI Metrics Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Statistic 
                  title="Total Items Tracked" 
                  value={metrics.totalItemsTracked || 142} 
                  valueStyle={{ color: '#2563eb', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Statistic 
                  title="Units in Circulation" 
                  value={metrics.totalUnitsInStock || 8520} 
                  valueStyle={{ color: '#059669', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Statistic 
                  title="Total Movements Count" 
                  value={metrics.totalMovementsCount || 384} 
                  valueStyle={{ color: '#d97706', fontWeight: 600 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Statistic 
                  title="Redis Cache Hit Rate" 
                  value="Sub-millisecond" 
                  valueStyle={{ color: '#16a34a', fontWeight: 600, fontSize: 18 }}
                  prefix={<ThunderboltFilled style={{ color: '#16a34a' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Requirement 2: AI Diagnostics Dashboard Widget */}
          <AIDiagnosticsWidget onEventSimulated={() => loadShipmentData(searchedId)} />

          {/* Requirement 1: Real-Time Shipment Tracking Interface */}
          <TrackShipment 
            shipmentData={shipmentData}
            loading={loading}
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            error={errorMsg}
          />

          {/* Requirement 1 & Chronological Audit Activity Dashboard */}
          <RecentAuditActivity 
            auditEvents={auditEvents}
            loading={loading}
            shipmentId={searchedId}
          />

        </Content>

        <Footer style={{ textAlign: 'center', color: '#64748b', fontSize: 13, background: 'transparent' }}>
          Audit Trail Logistics Ledger ©2026 • Day 25: Real-Time SSE Streaming, AI Diagnostics & Redis Read-Model Caching
        </Footer>
      </Layout>

      {/* Live CQRS Write Command Dispatch Modal */}
      <Modal
        title={<><SendOutlined style={{ color: '#2563eb', marginRight: 8 }} /> Dispatch Transit Event (Write Command)</>}
        open={modalVisible}
        onOk={handleDispatchMovement}
        confirmLoading={dispatching}
        onCancel={() => setModalVisible(false)}
        okText="Dispatch Event"
        cancelText="Cancel"
      >
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">Target Aggregate ID:</Text>
          <Input value={searchedId} disabled style={{ marginTop: 4, marginBottom: 16 }} />

          <Text type="secondary">Location / Transit Checkpoint:</Text>
          <Input 
            value={dispatchLocation} 
            onChange={(e) => setDispatchLocation(e.target.value)} 
            style={{ marginTop: 4, marginBottom: 16 }} 
          />

          <Text type="secondary">Quantity Delta (+/- Units):</Text>
          <div style={{ marginTop: 4 }}>
            <InputNumber 
              value={dispatchQty} 
              onChange={(val) => setDispatchQty(val || 0)} 
              style={{ width: '100%' }} 
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            * This executes a CQRS Write Command via POST /api/commands/inventory/:id/stock with Zero-Trust RBAC.
          </Text>
        </div>
      </Modal>
    </Layout>
  );
};

export default MainPage;
