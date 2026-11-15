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
  Tag,
  Select
} from 'antd';
import { 
  DashboardOutlined, 
  ShoppingCartOutlined, 
  BarChartOutlined, 
  HistoryOutlined,
  PlusCircleOutlined,
  SendOutlined,
  ThunderboltFilled,
  ThunderboltOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  UserOutlined,
  DownloadOutlined
} from '@ant-design/icons';

// Teammate Components
import Dashboard from './dashboard.jsx';
import VisualizationPanel from './components/visualization/Visualizationpanel.jsx';
import TrackShipment from './components/TrackShipment.jsx';
import RecentAuditActivity from './components/RecentAuditActivity.jsx';
import AIDiagnosticsWidget from './components/AIDiagnosticsWidget.jsx';

import { 
  getShipmentReadModel, 
  getShipmentAuditHistory, 
  getRealtimeMetrics, 
  dispatchStockMovement,
  simulateLogisticsEvent,
  login,
  getStoredUser
} from './services/api.js';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

const MainPage: React.FC = () => {
  // Navigation State
  const [selectedTab, setSelectedTab] = useState<string>('1');

  // Shipment & Ledger States
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
  const [activeRole, setActiveRole] = useState<string>(getStoredUser().role || 'LOGISTICS_MANAGER');



  const handleRoleChange = async (newRole: string) => {
    try {
      await login({ role: newRole });
      setActiveRole(newRole);
      message.success(`Zero-Trust clearance updated: Active Role is now ${newRole}`);
    } catch (err: any) {
      message.error('Failed to switch role: ' + err.message);
    }
  };

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
      setAuditEvents(history || []);
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
      setTimeout(() => loadShipmentData(searchedId), 500);
    } catch (err: any) {
      message.error(err.message || 'Failed to dispatch write command');
    } finally {
      setDispatching(false);
    }
  };

  // Simulates a live logistics event via SSE
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

  // Export Nausheen JSON Audit Ledger
  const exportLedgerData = () => {
    const exportPayload = {
      shipmentId: searchedId,
      exportedAt: new Date().toISOString(),
      readModel: shipmentData,
      auditTrail: auditEvents
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ledger-${searchedId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    message.success(`Audit ledger JSON exported for ${searchedId}`);
  };

  const getBreadcrumbLabel = () => {
    switch (selectedTab) {
      case '1': return 'Overview & Recharts Analytics';
      case '2': return 'Sensor Telemetry & State Scrubber';
      case '3': return 'AI Diagnostics & Anomaly Detection';
      case '4': return 'Verified Cryptographic Ledger & CQRS';
      default: return 'Overview';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar with Navigation Tabs */}
      <Sider 
        width={240} 
        breakpoint="lg" 
        collapsedWidth="0" 
        style={{ 
          background: '#0f172a',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          zIndex: 10
        }}
      >
        <div style={{ 
          height: '48px', 
          margin: '16px', 
          background: 'linear-gradient(135deg, #2563eb, #38bdf8)', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '0.05em',
          fontSize: '15px'
        }}>
          🛡️ AUDIT LEDGER
        </div>
        <Menu 
          theme="dark" 
          selectedKeys={[selectedTab]} 
          mode="inline" 
          onClick={({ key }) => setSelectedTab(key)}
          style={{ background: '#0f172a', fontSize: '14px' }}
          items={[
            { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
            { key: '2', icon: <ShoppingCartOutlined />, label: 'Shipments & Visualization' },
            { key: '3', icon: <BarChartOutlined />, label: 'Analytics & Diagnostics' },
            { key: '4', icon: <HistoryOutlined />, label: 'Audit Logs & Ledger' }
          ]}
        />
      </Sider>

      {/* Main Layout Area */}
      <Layout className="site-layout" style={{ background: '#f8fafc' }}>
        <Header style={{ 
          background: '#ffffff', 
          padding: '0 28px', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          minHeight: '64px'
        }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>
              Audit Trail: Event-Sourced Logistics Ledger
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <Tag color="geekblue">Day 28: CQRS Complete</Tag>
              <Tag color="green" icon={<SafetyCertificateOutlined />}>Zero-Trust RBAC</Tag>
              <Tag color="volcano" icon={<LockOutlined />}>Rate Limiting</Tag>
              <Tag color="cyan" icon={<DatabaseOutlined />}>Redis Caching</Tag>
            </div>
          </div>

          <Space wrap align="center">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <UserOutlined style={{ color: '#64748b' }} />
              <Text style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Role:</Text>
              <Select
                size="small"
                value={activeRole}
                onChange={handleRoleChange}
                style={{ width: 175 }}
                options={[
                  { value: 'LOGISTICS_MANAGER', label: 'LOGISTICS_MANAGER' },
                  { value: 'CISO_ADMIN', label: 'CISO_ADMIN' },
                  { value: 'COMPLIANCE_AUDITOR', label: 'COMPLIANCE_AUDITOR' },
                  { value: 'PUBLIC_VIEWER', label: 'PUBLIC_VIEWER' }
                ]}
              />
            </div>

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

        <Content style={{ margin: '16px 24px', minHeight: 'calc(100vh - 140px)' }}>
          <Breadcrumb style={{ marginBottom: 16 }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>
              {selectedTab === '1' && 'Dashboard'}
              {selectedTab === '2' && 'Shipments'}
              {selectedTab === '3' && 'Analytics'}
              {selectedTab === '4' && 'Audit Logs'}
            </Breadcrumb.Item>
            <Breadcrumb.Item>{getBreadcrumbLabel()}</Breadcrumb.Item>
          </Breadcrumb>

          {/* TAB 1: Zeba's Recharts PieChart Dashboard */}
          {selectedTab === '1' && (
            <div style={{ background: '#ffffff', borderRadius: 12, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Dashboard />
            </div>
          )}

          {/* TAB 2: Srinivas's Visualization Panel (Sensor Charts & State Scrubber) */}
          {selectedTab === '2' && (
            <div style={{ borderRadius: 16, overflow: 'hidden' }}>
              <VisualizationPanel />
            </div>
          )}

          {/* TAB 3: Satyam's Analytics & AI Diagnostics */}
          {selectedTab === '3' && (
            <div>
              {/* KPI Metrics Row */}
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

              {/* AI Diagnostics Engine */}
              <AIDiagnosticsWidget onEventSimulated={() => loadShipmentData(searchedId)} />
            </div>
          )}

          {/* TAB 4: Nausheen & Satyam's Verified Audit Logs & Ledger */}
          {selectedTab === '4' && (
            <div>
              {/* Nausheen Active Shipment & Export Bar */}
              <Card style={{ marginBottom: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Active Shipment Ledger: <Text code style={{ fontSize: 16 }}>{searchedId}</Text>
                  </Title>
                  <Space>
                    <Button icon={<DownloadOutlined />} onClick={exportLedgerData} type="primary" ghost>
                      Export Audit Log (JSON)
                    </Button>
                  </Space>
                </Row>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}>
                    <Text type="secondary">Ledger Status:</Text>
                    <div><Tag color={shipmentData?.status === 'IN TRANSIT' ? 'processing' : 'success'}>{shipmentData?.status || 'IN TRANSIT'}</Tag></div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Text type="secondary">Current Location:</Text>
                    <div><Text strong>{shipmentData?.location || 'Central Gateway Hub'}</Text></div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Text type="secondary">In Stock Units:</Text>
                    <div><Text strong>{shipmentData?.quantityOnHand ?? 850} units</Text></div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Text type="secondary">Current Version:</Text>
                    <div><Text code>v{shipmentData?.version ?? 4}</Text></div>
                  </Col>
                </Row>
              </Card>

              {/* Live Search & Track Component */}
              <TrackShipment 
                shipmentData={shipmentData}
                loading={loading}
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                error={errorMsg}
              />

              {/* Chronological Immutable Audit Trail */}
              <RecentAuditActivity 
                auditEvents={auditEvents}
                loading={loading}
                shipmentId={searchedId}
              />
            </div>
          )}
        </Content>

        <Footer style={{ textAlign: 'center', color: '#64748b', fontSize: 13, background: 'transparent' }}>
          Audit Trail Logistics Ledger ©2026 • Full Team Integration (Zeba, Srinivas, Nausheen, Satyam)
        </Footer>
      </Layout>

      {/* CQRS Write Command Dispatch Modal */}
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
            * Dispatches a CQRS Write Command to POST /api/commands/inventory/:id/stock with optimistic concurrency control and EventStore persistence.
          </Text>
        </div>
      </Modal>
    </Layout>
  );
};

export default MainPage;
