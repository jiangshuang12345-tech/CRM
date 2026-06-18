import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { genCouponCode, getState, setState, useStore } from '../store'
import { BUSINESS_LINES, LINE_CURRENCY } from '../types'
import type { BusinessLine, Coupon, CouponProduct, CouponStatus } from '../types'
import { useSession } from '../auth'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

function currencyOptions(line: BusinessLine) {
  const opts = [{ label: '美元 (USD)', value: 'USD' }]
  if (line !== '其他') opts.unshift({ label: LINE_CURRENCY[line].label, value: LINE_CURRENCY[line].code })
  return opts
}

// ====== 可用商品搜索框（输入课包ID，回车搜索，可多次添加） ======
function ProductPicker({
  value = [],
  onChange,
}: {
  value?: CouponProduct[]
  onChange?: (v: CouponProduct[]) => void
}) {
  const [text, setText] = useState('')

  const add = () => {
    const id = text.trim()
    if (!id) return
    if (value.some((p) => p.id.toLowerCase() === id.toLowerCase())) {
      message.warning('该商品已添加')
      setText('')
      return
    }
    const pkg = getState().packages.find((p) => p.id.toLowerCase() === id.toLowerCase())
    if (!pkg) {
      message.error(`未找到课包：${id}`)
      return
    }
    onChange?.([...value, { id: pkg.id, name: pkg.name, price: pkg.price }])
    setText('')
  }

  const remove = (id: string) => onChange?.(value.filter((p) => p.id !== id))

  const columns: ColumnsType<CouponProduct> = [
    { title: 'ID', dataIndex: 'id', width: 120 },
    { title: '用户侧名称', dataIndex: 'name' },
    { title: '现价', dataIndex: 'price', width: 140, render: (v) => v.toLocaleString() },
    {
      title: '操作',
      key: 'op',
      width: 90,
      render: (_, r) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(r.id)}>
          删除
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Input
        placeholder="输入课程包ID，回车搜索，可多次添加"
        prefix={<SearchOutlined />}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPressEnter={add}
        suffix={
          <Button type="link" size="small" onClick={add} style={{ padding: 0 }}>
            添加
          </Button>
        }
      />
      <Table
        style={{ marginTop: 12 }}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={value}
        pagination={false}
        locale={{ emptyText: '暂无数据' }}
      />
    </div>
  )
}

// ====== 生成券表单 ======
function CreateCoupon({ line, onBack }: { line: BusinessLine; onBack: () => void }) {
  const session = useSession()
  const [form] = Form.useForm()

  const submit = async () => {
    const v = await form.validateFields()
    const [claimStart, claimEnd] = v.claimRange as [Dayjs, Dayjs]
    const [useStart, useEnd] = v.useRange as [Dayjs, Dayjs]
    const coupon: Coupon = {
      id: `CP${Math.floor(1000 + Math.random() * 9000)}`,
      name: v.name,
      code: genCouponCode(),
      businessLine: line,
      couponType: '满减券',
      currency: v.currency,
      creator: session?.email ?? 'admin@dinoai.ai',
      total: v.total,
      remaining: v.total,
      claimStart: claimStart.format('YYYY-MM-DD HH:mm:ss'),
      claimEnd: claimEnd.format('YYYY-MM-DD HH:mm:ss'),
      useStart: useStart.format('YYYY-MM-DD HH:mm:ss'),
      useEnd: useEnd.format('YYYY-MM-DD HH:mm:ss'),
      products: v.products ?? [],
      thresholdAmount: v.thresholdAmount,
      deductAmount: v.deductAmount,
      status: claimEnd.isBefore(dayjs()) ? '已结束' : '已生效',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    setState((prev) => ({ ...prev, coupons: [coupon, ...prev.coupons] }))
    message.success('优惠券已生成')
    onBack()
  }

  return (
    <Card
      className="page-card"
      bordered={false}
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack} size="small" />
          <span className="section-title" style={{ borderLeft: 'none', paddingLeft: 0 }}>
            生成券 · {line}
          </span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ flex: '0 0 130px' }}
        wrapperCol={{ flex: '1 1 auto' }}
        labelAlign="right"
        style={{ maxWidth: 760 }}
        initialValues={{
          businessLine: line,
          couponType: '满减券',
          creator: session?.email ?? 'admin@dinoai.ai',
        }}
      >
        <Title level={5}>券基本信息</Title>
        <Form.Item name="businessLine" label="业务类型">
          <Select disabled options={[{ label: line, value: line }]} />
        </Form.Item>
        <Form.Item name="couponType" label="券类型" tooltip="一期仅支持满减券">
          <Select disabled options={[{ label: '满减券', value: '满减券' }]} />
        </Form.Item>
        <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}>
          <Select placeholder="请选择币种" options={currencyOptions(line)} style={{ maxWidth: 280 }} />
        </Form.Item>
        <Form.Item name="name" label="券名称" rules={[{ required: true, message: '请输入券名称' }]}>
          <Input placeholder="请输入券名称" maxLength={30} showCount />
        </Form.Item>
        <Form.Item name="creator" label="创建人">
          <Input disabled />
        </Form.Item>

        <Divider />
        <Title level={5}>券发放及领取规则</Title>
        <Form.Item name="total" label="券发放数量" rules={[{ required: true, message: '请输入发放数量' }]}>
          <InputNumber style={{ width: 280 }} min={1} placeholder="请输入发放数量" />
        </Form.Item>
        <Form.Item name="claimRange" label="券领取有效期" rules={[{ required: true, message: '请选择领取有效期' }]}>
          <RangePicker showTime style={{ width: 400 }} placeholder={['开始时间', '结束时间']} />
        </Form.Item>

        <Divider />
        <Title level={5}>券使用规则</Title>
        <Form.Item name="useRange" label="券使用有效期" rules={[{ required: true, message: '请选择使用有效期' }]}>
          <RangePicker showTime style={{ width: 400 }} placeholder={['开始时间', '结束时间']} />
        </Form.Item>
        <Form.Item
          name="products"
          label="可用商品"
          rules={[{ required: true, message: '请至少添加一个可用商品' }]}
        >
          <ProductPicker />
        </Form.Item>

        <Divider />
        <Title level={5}>券权益规则</Title>
        <Form.Item label="满减规则" required style={{ marginBottom: 0 }}>
          <Space align="baseline" wrap>
            <span>满</span>
            <Form.Item name="thresholdAmount" rules={[{ required: true, message: '请输入门槛金额' }]}>
              <InputNumber min={0} placeholder="门槛金额" style={{ width: 160 }} />
            </Form.Item>
            <span>减</span>
            <Form.Item
              name="deductAmount"
              dependencies={['thresholdAmount']}
              rules={[
                { required: true, message: '请输入抵扣金额' },
                ({ getFieldValue }) => ({
                  validator: (_, val) =>
                    val == null || val <= (getFieldValue('thresholdAmount') ?? Infinity)
                      ? Promise.resolve()
                      : Promise.reject(new Error('抵扣金额不能大于门槛金额')),
                }),
              ]}
            >
              <InputNumber min={0} placeholder="抵扣金额" style={{ width: 160 }} />
            </Form.Item>
          </Space>
        </Form.Item>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button onClick={onBack}>返回</Button>
            <Button type="primary" onClick={submit}>
              确定生成
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  )
}

// ====== 优惠券主页面 ======
export default function CouponPage() {
  const coupons = useStore((s) => s.coupons)
  const [view, setView] = useState<'list' | 'create'>('list')
  const [createLine, setCreateLine] = useState<BusinessLine>('韩国')
  const [pickLineOpen, setPickLineOpen] = useState(false)
  const [pickedLine, setPickedLine] = useState<BusinessLine | null>(null)

  const [keyword, setKeyword] = useState('')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  // 编辑可用商品弹窗
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null)
  const [editProducts, setEditProducts] = useState<CouponProduct[]>([])

  // 延长时间弹窗
  const [extendCoupon, setExtendCoupon] = useState<Coupon | null>(null)
  const [extendTime, setExtendTime] = useState<Dayjs | null>(null)

  // 详情弹窗
  const [detailCoupon, setDetailCoupon] = useState<Coupon | null>(null)

  const data = useMemo(
    () =>
      coupons.filter((c) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          c.id.toLowerCase().includes(kw) ||
          c.name.toLowerCase().includes(kw) ||
          c.code.toLowerCase().includes(kw)
        return (
          matchKw &&
          (!lineFilter || c.businessLine === lineFilter) &&
          (!statusFilter || c.status === statusFilter)
        )
      }),
    [coupons, keyword, lineFilter, statusFilter],
  )

  const confirmPickLine = () => {
    if (!pickedLine) {
      message.error('请选择业务类型')
      return
    }
    setCreateLine(pickedLine)
    setPickLineOpen(false)
    setView('create')
  }

  const openEdit = (c: Coupon) => {
    setEditCoupon(c)
    setEditProducts(c.products)
  }
  const saveEdit = () => {
    if (!editCoupon) return
    if (editProducts.length === 0) {
      message.error('请至少配置一个可用商品')
      return
    }
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) => (c.id === editCoupon.id ? { ...c, products: editProducts } : c)),
    }))
    message.success('已保存可用商品')
    setEditCoupon(null)
  }

  const openExtend = (c: Coupon) => {
    setExtendCoupon(c)
    setExtendTime(null)
  }
  const saveExtend = () => {
    if (!extendCoupon || !extendTime) {
      message.error('请选择更改后的时间')
      return
    }
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) =>
        c.id === extendCoupon.id
          ? {
              ...c,
              claimEnd: extendTime.format('YYYY-MM-DD HH:mm:ss'),
              status: extendTime.isAfter(dayjs()) ? '已生效' : c.status,
            }
          : c,
      ),
    }))
    message.success('领取截止时间已更新')
    setExtendCoupon(null)
  }

  const stopIssue = (c: Coupon) =>
    Modal.confirm({
      title: '停止发放',
      content: `确认停止发放「${c.name}」？停止后领取状态将变为「已结束」，用户无法继续领取。`,
      okText: '确认停止',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () =>
        setState((prev) => ({
          ...prev,
          coupons: prev.coupons.map((x) => (x.id === c.id ? { ...x, status: '已结束' } : x)),
        })),
    })

  const columns: ColumnsType<Coupon> = [
    { title: '券ID', dataIndex: 'id', width: 90, fixed: 'left' },
    { title: '券名称', dataIndex: 'name', width: 200 },
    { title: '券码', dataIndex: 'code', width: 150, render: (v) => <Text code>{v}</Text> },
    { title: '业务线', dataIndex: 'businessLine', width: 90, render: (v) => <Tag color="geekblue">{v}</Tag> },
    { title: '币种', dataIndex: 'currency', width: 80 },
    { title: '券总量', dataIndex: 'total', width: 100, align: 'right', render: (v) => v.toLocaleString() },
    {
      title: '剩余数量',
      dataIndex: 'remaining',
      width: 100,
      align: 'right',
      render: (v) => v.toLocaleString(),
    },
    { title: '创建人', dataIndex: 'creator', width: 170 },
    {
      title: '领取状态',
      dataIndex: 'status',
      width: 100,
      render: (v: CouponStatus) => <Tag color={v === '已生效' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 290,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => setDetailCoupon(r)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => openExtend(r)}>
            延长时间
          </Button>
          <Button type="link" size="small" danger disabled={r.status === '已结束'} onClick={() => stopIssue(r)}>
            停止发放
          </Button>
        </Space>
      ),
    },
  ]

  if (view === 'create') {
    return <CreateCoupon line={createLine} onBack={() => setView('list')} />
  }

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">优惠券管理</span>}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setPickedLine(null)
            setPickLineOpen(true)
          }}
        >
          生成券
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="券ID / 券名称 / 券码"
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder="业务线"
          style={{ width: 140 }}
          value={lineFilter}
          onChange={setLineFilter}
          options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
        />
        <Select
          allowClear
          placeholder="领取状态"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={(['已生效', '已结束'] as CouponStatus[]).map((l) => ({ label: l, value: l }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1500 }}
        pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
      />

      {/* 选择业务类型弹窗 */}
      <Modal
        open={pickLineOpen}
        title="请选择业务类型"
        onCancel={() => setPickLineOpen(false)}
        onOk={confirmPickLine}
        okText="确定"
        cancelText="取消"
        width={460}
      >
        <Radio.Group
          value={pickedLine ?? undefined}
          onChange={(e) => setPickedLine(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space size={12} wrap style={{ padding: '12px 0' }}>
            {BUSINESS_LINES.map((l) => (
              <Radio.Button key={l} value={l} style={{ minWidth: 84, textAlign: 'center' }}>
                {l}
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>
      </Modal>

      {/* 编辑 - 券使用规则（可用商品） */}
      <Modal
        open={!!editCoupon}
        title="券使用规则"
        onCancel={() => setEditCoupon(null)}
        width={760}
        footer={[
          <Button key="back" onClick={() => setEditCoupon(null)}>
            返回
          </Button>,
          <Button key="ok" type="primary" onClick={saveEdit}>
            确定
          </Button>,
        ]}
      >
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ color: '#ff4d4f' }}>
              *
            </Text>{' '}
            <Text strong>可用商品：</Text>
          </div>
          <ProductPicker value={editProducts} onChange={setEditProducts} />
        </div>
      </Modal>

      {/* 延长时间 */}
      <Modal
        open={!!extendCoupon}
        title="延长时间"
        onCancel={() => setExtendCoupon(null)}
        onOk={saveExtend}
        okText="确定"
        cancelText="取消"
        width={460}
      >
        {extendCoupon && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">当前领取截止时间：</Text>
              <Text strong>{extendCoupon.claimEnd}</Text>
            </div>
            <Space>
              <Text>更改时间：</Text>
              <DatePicker
                showTime
                value={extendTime ?? undefined}
                onChange={(v) => setExtendTime(v)}
                placeholder="选择日期时间"
                style={{ width: 260 }}
              />
            </Space>
          </div>
        )}
      </Modal>

      {/* 券详情 */}
      <Modal
        open={!!detailCoupon}
        title="优惠券详情"
        footer={[
          <Button key="close" onClick={() => setDetailCoupon(null)}>
            关闭
          </Button>,
        ]}
        width={680}
        onCancel={() => setDetailCoupon(null)}
      >
        {detailCoupon && (
          <div style={{ marginTop: 12 }}>
            <Divider orientation="left" plain style={{ marginTop: 0 }}>
              券基本信息
            </Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="券ID">{detailCoupon.id}</Descriptions.Item>
              <Descriptions.Item label="券码">
                <Text code>{detailCoupon.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="券名称" span={2}>
                {detailCoupon.name}
              </Descriptions.Item>
              <Descriptions.Item label="业务线">
                <Tag color="geekblue">{detailCoupon.businessLine}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="券类型">{detailCoupon.couponType}</Descriptions.Item>
              <Descriptions.Item label="币种">{detailCoupon.currency}</Descriptions.Item>
              <Descriptions.Item label="创建人">{detailCoupon.creator}</Descriptions.Item>
              <Descriptions.Item label="领取状态">
                <Tag color={detailCoupon.status === '已生效' ? 'green' : 'default'}>{detailCoupon.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{detailCoupon.createdAt}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>
              发放及领取规则
            </Divider>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="券总量">{detailCoupon.total.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="剩余数量">{detailCoupon.remaining.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="领取有效期" span={2}>
                {detailCoupon.claimStart} ~ {detailCoupon.claimEnd}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>
              使用规则
            </Divider>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="使用有效期">
                {detailCoupon.useStart} ~ {detailCoupon.useEnd}
              </Descriptions.Item>
              <Descriptions.Item label="满减规则">
                满 {detailCoupon.thresholdAmount.toLocaleString()}，减 {detailCoupon.deductAmount.toLocaleString()}（
                {detailCoupon.currency}）
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12 }}>
              <Text strong>可用商品</Text>
              <Table
                style={{ marginTop: 8 }}
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detailCoupon.products}
                locale={{ emptyText: '暂无数据' }}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 100 },
                  { title: '用户侧名称', dataIndex: 'name' },
                  { title: '现价', dataIndex: 'price', width: 120, render: (v) => v.toLocaleString() },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  )
}
