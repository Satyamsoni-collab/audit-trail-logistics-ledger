import React, { useState } from 'react';
import { Layout, Menu, Breadcrumb, Input, Card, Tag, Typography, Row, Col, Table, Badge } from 'antd';
import { DashboardOutlined, ShoppingCartOutlined, BarChartOutlined, HistoryOutlined } from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Search } = Input;
const { Title, Text } = Typography;

const MainPage: React.FC = () => {
  const [searchedId, setSearchedId] = useState<string>('SHP-10024');

  const onSearch = (value: string) => {
    if (value.trim()) {
      setSearchedId(value);
    }
  };

  const auditHistory = [
    { key: '1', event: 'Order Created', location: 'Warehouse 01', timestamp: '2026-09-24 10:15 AM', status: 'Success' },
    { key: '2', event: 'Dispatched', location: 'Mumbai Hub', timestamp: '2026-09-24 02:40 PM', status: 'In Transit' },
    { key: '3', event: 'Customs Cleared', location: 'Delhi Gateway', timestamp: '2026-09-24 06:10 PM', status: 'Success' },
  ];

  const columns = [
    { title: 'Event Name', dataIndex: 'event', key: 'event' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge status={status === 'Success' ? 'success' : 'processing'} text={status} />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px' }} />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<DashboardOutlined />}>Dashboard</Menu.Item>
          <Menu.Item key="2" icon={<ShoppingCartOutlined />}>Shipments</Menu.Item>
          <Menu.Item key="3" icon={<BarChartOutlined />}>Audit Logs</Menu.Item>
        </Menu>
      </Sider>

      <Layout className="site-layout">
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <Title level={4} style={{ margin: '16px 0 0 0' }}>Audit Trail Logistics Ledger</Title>
        </Header>

        <Content style={{ margin: '0 24px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
          </Breadcrumb>

          <div style={{ background: '#fff', padding: 24, minHeight: 400, borderRadius: 8 }}>
            <Row gutter={[16, 24]}>
              <Col span={24}>
                <Title level={4}>Track Shipment</Title>
                <Search
                  placeholder="Enter Shipment ID (e.g., SHP-10024)"
                  allowClear
                  enterButton="Track Shipment"
                  size="large"
                  onSearch={onSearch}
                  style={{ maxWidth: 500 }}
                />
              </Col>

              <Col span={24}>
                <Card title={`Active Shipment: ${searchedId}`} bordered={true}>
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Text type="secondary">Status:</Text><br />
                      <Tag color="blue" style={{ marginTop: 4 }}>IN TRANSIT</Tag>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Origin:</Text><br />
                      <Text strong>Mumbai Hub</Text>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Destination:</Text><br />
                      <Text strong>Delhi Warehouse</Text>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Last Updated:</Text><br />
                      <Text strong>Just now</Text>
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col span={24}>
                <Card title={<><HistoryOutlined /> Recent Audit Activity</>} bordered={true}>
                  <Table dataSource={auditHistory} columns={columns} pagination={false} size="small" />
                </Card>
              </Col>
            </Row>
          </div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          Audit Trail Logistics Ledger ©2026 - Week 1 Deliverable
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainPage;