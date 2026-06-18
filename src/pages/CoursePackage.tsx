import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { setState, useStore } from '../store'
import { BUSINESS_LINES, LINE_CURRENCY } from '../types'
import type { BusinessLine, CoursePackage } from '../types'
import { useSession } from '../auth'

const { Text } = Typography

function currencyOptions(line?: BusinessLine) {
  const opts = [{ label: '美元 (USD)', value: 'USD' }]
  if (line && line !== '其他') {
    const c = LINE_CURRENCY[line]
    opts.unshift({ label: c.label, value: c.code })
  }
  return opts
}

export default function CoursePackagePage() {
  const packages = useStore((s) => s.packages)
  const session = useSession()
  const [keyword, setKeyword] = useState('')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; record?: CoursePackage } | null>(null)
  const [detail, setDetail] = useState<CoursePackage | null>(null)
  const [form] = Form.useForm()
  const watchLine = Form.useWatch('businessLine', form) as BusinessLine | undefined

  const data = useMemo(
    () =>
      packages.filter((p) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw = !kw || p.id.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw)
        return matchKw && (!lineFilter || p.businessLine === lineFilter)
      }),
    [packages, keyword, lineFilter],
  )

  const openAdd = () => {
    setModal({ mode: 'add' })
    form.resetFields()
  }
  const openEdit = (record: CoursePackage) => {
    setModal({ mode: 'edit', record })
    form.setFieldsValue(record)
  }

  const submit = async () => {
    const v = await form.validateFields()
    if (modal?.mode === 'add') {
      const pkg: CoursePackage = {
        id: `PKG${Math.floor(1000 + Math.random() * 9000)}`,
        businessLine: v.businessLine,
        name: v.name,
        currency: v.currency,
        price: v.price,
        validDays: v.validDays,
        creator: session?.email ?? 'admin@dinoai.ai',
        status: '上架',
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      setState((prev) => ({ ...prev, packages: [pkg, ...prev.packages] }))
      message.success('课包已新增并上架')
    } else if (modal?.record) {
      setState((prev) => ({
        ...prev,
        packages: prev.packages.map((p) =>
          p.id === modal.record!.id
            ? { ...p, businessLine: v.businessLine, name: v.name, currency: v.currency, price: v.price, validDays: v.validDays }
            : p,
        ),
      }))
      message.success('课包已更新')
    }
    setModal(null)
  }

  const toggleShelf = (record: CoursePackage) => {
    const next = record.status === '上架' ? '下架' : '上架'
    Modal.confirm({
      title: next === '下架' ? '下架课包' : '上架课包',
      content: `确认${next}「${record.name}」？`,
      okButtonProps: next === '下架' ? { danger: true } : undefined,
      onOk: () =>
        setState((prev) => ({
          ...prev,
          packages: prev.packages.map((p) => (p.id === record.id ? { ...p, status: next } : p)),
        })),
    })
  }

  const columns: ColumnsType<CoursePackage> = [
    { title: '课包ID', dataIndex: 'id', width: 120 },
    { title: '业务线', dataIndex: 'businessLine', width: 100, render: (v) => <Tag color="geekblue">{v}</Tag> },
    { title: '课包名称', dataIndex: 'name', width: 220 },
    {
      title: '价格',
      dataIndex: 'price',
      width: 150,
      render: (v, r) => (
        <Text strong>
          {r.currency} {v.toLocaleString()}
        </Text>
      ),
    },
    { title: '有效期', dataIndex: 'validDays', width: 100, render: (v) => `${v} 天` },
    { title: '创建人', dataIndex: 'creator', width: 180 },
    {
      title: '课包状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => <Tag color={v === '上架' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" onClick={() => setDetail(r)}>
            详情
          </Button>
          <Button type="link" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button type="link" danger={r.status === '上架'} onClick={() => toggleShelf(r)}>
            {r.status === '上架' ? '下架' : '上架'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">课包管理</span>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增课包
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="课包ID / 课包名称"
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder="业务线"
          style={{ width: 150 }}
          value={lineFilter}
          onChange={setLineFilter}
          options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1200 }}
        pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
      />

      <Modal
        open={!!modal}
        title={modal?.mode === 'add' ? '新增课包' : '编辑课包'}
        onCancel={() => setModal(null)}
        onOk={submit}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 12 }}>
          <Form.Item name="businessLine" label="业务线" rules={[{ required: true, message: '请选择业务线' }]}>
            <Select
              placeholder="请选择业务线"
              options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
              onChange={() => form.setFieldValue('currency', undefined)}
            />
          </Form.Item>
          <Form.Item name="name" label="课包名称" rules={[{ required: true, message: '请输入课包名称' }]}>
            <Input placeholder="请输入课包名称" />
          </Form.Item>
          <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}>
            <Select placeholder="请选择币种" options={currencyOptions(watchLine)} />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="请输入价格" />
          </Form.Item>
          <Form.Item name="validDays" label="有效期（天）" rules={[{ required: true, message: '请输入有效期' }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入有效期天数" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!detail} title="课包详情" footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="课包ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="业务线">{detail.businessLine}</Descriptions.Item>
            <Descriptions.Item label="课包名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="价格">
              {detail.currency} {detail.price.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="有效期">{detail.validDays} 天</Descriptions.Item>
            <Descriptions.Item label="创建人">{detail.creator}</Descriptions.Item>
            <Descriptions.Item label="课包状态">
              <Tag color={detail.status === '上架' ? 'green' : 'default'}>{detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  )
}
