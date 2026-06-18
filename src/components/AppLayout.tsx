import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Modal, Typography } from 'antd'
import {
  ApartmentOutlined,
  TeamOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  TagsOutlined,
  LogoutOutlined,
  DownOutlined,
  RedoOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logout, useSession } from '../auth'
import { resetState } from '../store'
import { LOGO } from '../logo'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const NAV = [
  { key: '/channels', icon: <ApartmentOutlined />, label: '渠道管理' },
  { key: '/users', icon: <TeamOutlined />, label: '用户中心' },
  { key: '/orders', icon: <ProfileOutlined />, label: '订单中心' },
  { key: '/packages', icon: <AppstoreOutlined />, label: '课包管理' },
  { key: '/coupons', icon: <TagsOutlined />, label: '优惠券管理' },
]

const TITLES: Record<string, string> = {
  '/channels': '渠道管理',
  '/users': '用户中心',
  '/orders': '订单中心',
  '/packages': '课包管理',
  '/coupons': '优惠券管理',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()

  const onLogout = () => {
    Modal.confirm({
      title: '确认登出',
      content: '是否退出当前账号？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => logout(),
    })
  }

  const onReset = () => {
    Modal.confirm({
      title: '重置演示数据',
      content: '将恢复所有渠道、用户、订单、课包、优惠券到初始演示数据。',
      okText: '重置',
      cancelText: '取消',
      onOk: () => resetState(),
    })
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={220}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <img src={LOGO} width={26} height={26} alt="logo" />
          {!collapsed && <span>Dino English 运营平台</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            {TITLES[location.pathname] ?? 'Dino English 运营平台'}
          </Text>
          <Dropdown
            menu={{
              items: [
                { key: 'reset', icon: <RedoOutlined />, label: '重置演示数据', onClick: onReset },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '登出', danger: true, onClick: onLogout },
              ],
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ background: '#2F6BFF' }}>{session?.email?.[0]?.toUpperCase()}</Avatar>
              <Text>{session?.email}</Text>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 20, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
