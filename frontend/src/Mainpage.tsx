import React, { useState } from 'react';
import { Layout, Menu, Breadcrumb, Input, Card, Tag, Typography, Row, Col, Table, Badge, Alert, Radio, Button, Space, message } from 'antd';
import { DashboardOutlined, ShoppingCartOutlined, BarChartOutlined, HistoryOutlined, DownloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Search } = Input;
const { Title, Text } = Typography;

const shipmentRecords: Record<string, any> = {
  'SHP-10024': {
    status: 'IN TRANSIT',
    tagColor: 'processing',
    origin: 'Mumbai Hub',
    destination: 'Delhi Warehouse',
    ledgerHash: '0x8f2a93c4e1b827361a9d0f73b8e45102cba39d71',
    lastCheck: 'Just now',
    events: [
      { key: '1', eventName: 'Order Created', location: 'Warehouse 01', timestamp: '2026-09-24 10:15 AM', status: 'Success', hash: '0x1a2b...3c4d' },
      { key: '2', eventName: 'Dispatched', location: 'Mumbai Hub', timestamp: '2026-09-24 02:45 PM', status: 'In Transit', hash: '0x5e6f...7g8h' },
      { key: '3', eventName: 'Customs Cleared', location: 'Delhi Gateway', timestamp: '2026-09-24 06:10 PM', status: 'Success', hash: '0x9i0j...1k2l' }
    ]
  },
  'SHP-20050': {
    status: 'DELIVERED',
    tagColor: 'success',
    origin: 'Bengaluru Plant',
    destination: 'Pune Fulfillment',
    ledgerHash: '0x3b7d12f9e4c856a02b1c4e7890fd34a12ec89b52',
    lastCheck: '2 hours ago',
    events: [
      { key: '1', eventName: 'Order Created', location: 'Bengaluru Plant', timestamp: '2026-09-23 09:00 AM', status: 'Success', hash: '0xaa11...22bb' },
      { key: '2', eventName: 'Dispatched', location: 'Bengaluru Hub', timestamp: '2026-09-23 01:20 PM', status: 'Success', hash: '0xcc33...44dd' },
      { key: '3', eventName: 'Delivered', location: 'Pune Fulfillment', timestamp: '2026-09-24 11:30 AM', status: 'Success', hash: '0xee55...66ff' }
    ]
  }
};

const columns = [
  { title: 'Event Name', dataIndex: 'eventName', key: 'eventName' },
  { title: 'Location', dataIndex: 'location', key: 'location' },
  { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp' },
  { title: 'Block Hash', dataIndex: 'hash', key: 'hash', render: (h: string) => <Text code>{h}</Text> },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (text: string) => (
      <Badge status={text === 'Success' ? 'success' : 'processing'} text={text} />
    )
  }
];

const Mainpage: React.FC = () => {
  const [searchedId, setSearchedId] = useState<string>('SHP-10024');
  const [activeData, setActiveData] = useState<any>(shipmentRecords['SHP-10024']);
  const [isFound, setIsFound] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const onSearch = (value: string) => {
    const query = value.trim().toUpperCase();
    if (shipmentRecords[query]) {
      setSearchedId(query);
      setActiveData(shipmentRecords[query]);
      setIsFound(true);
      message.success(`Ledger records loaded for ${query}`);
    } else {
      setSearchedId(query);
      setIsFound(false);
      message.error(`No ledger entry found for ID: ${query}`);
    }
  };

  const exportLedgerData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ledger-${searchedId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    message.success("Audit ledger report downloaded!");
  };

  const filteredEvents = activeData?.events.filter((item: any) => {
    if (filterStatus === 'ALL') return true;
    return item.status.toUpperCase() === filterStatus;
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={[
            { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
            { key: '2', icon: <ShoppingCartOutlined />, label: 'Shipments' },
            { key: '3', icon: <BarChartOutlined />, label: 'Analytics' },
            { key: '4', icon: <HistoryOutlined />, label: 'Audit Logs' }
          ]}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Audit Trail Logistics Ledger</Title>
          <Tag icon={<SafetyCertificateOutlined />} color="cyan">Ledger Network: Active</Tag>
        </Header>

        <Content style={{ margin: '24px 16px 0' }}>
          <Breadcrumb style={{ marginBottom: 16 }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
            <Breadcrumb.Item>Audit Ledger (Weeks 3 & 4)</Breadcrumb.Item>
          </Breadcrumb>

          <div style={{ padding: 24, background: '#fff', minHeight: 400, borderRadius: 8 }}>
            <Title level={5}>Track Shipment</Title>
            <Search
              placeholder="Enter Shipment ID (e.g., SHP-10024, SHP-20050)"
              enterButton="Track Shipment"
              size="large"
              onSearch={onSearch}
              style={{ maxWidth: 600, marginBottom: 24 }}
            />

            {!isFound && (
              <Alert
                message="Record Not Found"
                description={`Shipment ID "${searchedId}" was not found in the verified ledger records.`}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {isFound && (
              <>
                <Card style={{ marginBottom: 24 }}>
                  <Row justify="space-between" align="middle">
                    <Title level={5} style={{ margin: 0 }}>Active Shipment: {searchedId}</Title>
                    <Button icon={<DownloadOutlined />} onClick={exportLedgerData}>
                      Export Audit Log (JSON)
                    </Button>
                  </Row>
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={12} sm={6}>
                      <Text type="secondary">Status:</Text>
                      <div><Tag color={activeData.tagColor}>{activeData.status}</Tag></div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text type="secondary">Origin:</Text>
                      <div><Text strong>{activeData.origin}</Text></div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text type="secondary">Destination:</Text>
                      <div><Text strong>{activeData.destination}</Text></div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Text type="secondary">Ledger Root Hash:</Text>
                      <div><Text code ellipsis style={{ maxWidth: 150 }}>{activeData.ledgerHash}</Text></div>
                    </Col>
                  </Row>
                </Card>

                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0 }}><HistoryOutlined /> Verified Audit Trail Activity</Title>
                  <Space>
                    <Text type="secondary">Filter Status:</Text>
                    <Radio.Group value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} buttonStyle="solid">
                      <Radio.Button value="ALL">All</Radio.Button>
                      <Radio.Button value="SUCCESS">Success</Radio.Button>
                      <Radio.Button value="IN TRANSIT">In Transit</Radio.Button>
                    </Radio.Group>
                  </Space>
                </Row>

                <Table
                  dataSource={filteredEvents}
                  columns={columns}
                  pagination={false}
                />
              </>
            )}
          </div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          Audit Trail Logistics Ledger ©2026 - Sprint Complete (Weeks 1 to 4)
        </Footer>
      </Layout>
    </Layout>
  );
};

export default Mainpage;