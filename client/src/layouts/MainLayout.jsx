import React, { useState } from 'react';
import { Layout, Menu, Typography, theme } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  InboxOutlined,
  ShoppingOutlined,
  TagOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '总览' },
  { key: '/inventory', icon: <InboxOutlined />, label: '库存管理' },
  { key: '/orders', icon: <ShoppingOutlined />, label: '订单管理' },
  { key: '/pricing', icon: <TagOutlined />, label: '定价补货' },
  {
    key: '/ads',
    icon: <BarChartOutlined />,
    label: '广告数据',
    disabled: true,
    title: '即将上线',
  },
];

const pageTitles = {
  '/': '总览',
  '/inventory': '库存管理',
  '/orders': '订单管理',
  '/pricing': '定价补货',
  '/ads': '广告数据',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const currentTitle = pageTitles[location.pathname] || '总览';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}` }}
        width={220}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 24px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {!collapsed && (
            <Text strong style={{ color: token.colorPrimary, fontSize: 18 }}>
              卖家后台
            </Text>
          )}
          {collapsed && (
            <Text strong style={{ color: token.colorPrimary, fontSize: 18 }}>
              S
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ border: 'none', marginTop: 8 }}
          items={menuItems}
          onClick={({ key }) => {
            const item = menuItems.find((m) => m.key === key);
            if (!item?.disabled) navigate(key);
          }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 16,
          }}
        >
          {/* Collapse toggle */}
          {React.createElement(
            collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
            {
              style: { fontSize: 18, cursor: 'pointer', color: token.colorTextSecondary },
              onClick: () => setCollapsed(!collapsed),
            }
          )}
          <Text strong style={{ fontSize: 16 }}>
            {currentTitle}
          </Text>
          <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 13 }}>
            最后同步：--
          </Text>
        </Header>

        <Content style={{ padding: 24, background: token.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
