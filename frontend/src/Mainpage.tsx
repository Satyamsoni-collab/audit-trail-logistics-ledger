import React from 'react';
import { Layout, Menu, Breadcrumb } from 'antd';
import { DashboardOutlined, ShoppingCartOutlined, BarChartOutlined } from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;

const MainPage: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div className="logo" style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<DashboardOutlined />}>
            Dashboard
          </Menu.Item>
          <Menu.Item key="2" icon={<ShoppingCartOutlined />}>
            Orders
          </Menu.Item>
          <Menu.Item key="3" icon={<BarChartOutlined />}>
            Statistics
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: 0 }} />
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>User</Breadcrumb.Item>
            <Breadcrumb.Item>Admin Dashboard</Breadcrumb.Item>
          </Breadcrumb>
          <div className="site-layout-background" style={{ padding: 24, minHeight: 360, background: '#fff' }}>
            <h1>Admin Dashboard - Welcome!</h1>
            <p>Here is your overview of logistics and audit trail data.</p>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Audit Trail Logistics Ledger ©2026 Created by your team
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainPage;