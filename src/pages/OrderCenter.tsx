import { useMemo, useState } from 'react'
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useStore } from '../store'
import type { Order, OrderStatus, UserStatus } from '../types'

const { Text } = Typography

const USER_STATUS_COLOR: Record<UserStatus, string> = {
  注册: 'default',
  体验: 'blue',
  付费: 'green',
  流失: 'red',
}
const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'green',
  已退款: 'red',
  已取消: 'default',
}

function fmtMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`
}

export default function OrderCenter() {
  const orders = useStore((s) => s.orders)
  const [keyword, setKeyword] = useState('')
  const [orderStatus, setOrderStatus] = useState<string | undefined>()
  const [payMethod, setPayMethod] = useState<string | undefined>()

  const data = useMemo(
    () =>
      orders.filter((o) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          o.orderId.toLowerCase().includes(kw) ||
          o.studentId.toLowerCase().includes(kw) ||
          o.productName.toLowerCase().includes(kw)
        return (
          matchKw &&
          (!orderStatus || o.orderStatus === orderStatus) &&
          (!payMethod || o.payMethod === payMethod)
        )
      }),
    [orders, keyword, orderStatus, payMethod],
  )

  const columns: ColumnsType<Order> = [
    { title: '订单ID', dataIndex: 'orderId', width: 180, fixed: 'left' },
    { title: '商品名称', dataIndex: 'productName', width: 180 },
    { title: '学生ID', dataIndex: 'studentId', width: 100 },
    {
      title: '用户状态',
      dataIndex: 'userStatus',
      width: 100,
      render: (v: UserStatus) => <Tag color={USER_STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      width: 100,
      render: (v: OrderStatus) => <Tag color={ORDER_STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: '原价',
      dataIndex: 'originalPrice',
      width: 140,
      align: 'right',
      render: (v, r) => <Text type="secondary">{fmtMoney(v, r.currency)}</Text>,
    },
    {
      title: '实际付款金额',
      dataIndex: 'paidAmount',
      width: 150,
      align: 'right',
      render: (v, r) => <Text strong>{fmtMoney(v, r.currency)}</Text>,
    },
    {
      title: '支付方式',
      dataIndex: 'payMethod',
      width: 130,
      render: (v) => <Tag>{v}</Tag>,
    },
    { title: '成功支付时间', dataIndex: 'paidTime', width: 180, render: (v) => v || <Text type="secondary">—</Text> },
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">订单中心</span>}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="订单ID / 学生ID / 商品名称"
          style={{ width: 260 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder="订单状态"
          style={{ width: 150 }}
          value={orderStatus}
          onChange={setOrderStatus}
          options={(['待支付', '已支付', '已退款', '已取消'] as OrderStatus[]).map((l) => ({ label: l, value: l }))}
        />
        <Select
          allowClear
          placeholder="支付方式"
          style={{ width: 160 }}
          value={payMethod}
          onChange={setPayMethod}
          options={['App Store', 'Google Play', 'Stripe', 'PayPal'].map((l) => ({ label: l, value: l }))}
        />
      </Space>

      <Table
        rowKey="orderId"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1400 }}
        pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
      />
    </Card>
  )
}
