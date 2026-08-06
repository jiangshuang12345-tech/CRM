import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { ImportOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { setState, uid, useStore } from '../store'
import type { BusinessLine, Student } from '../types'
import { BUSINESS_LINES } from '../types'
import { usePerm } from '../perm'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

type LeadRow = { phone: string; name?: string }

function phoneKey(phone: string) {
  return phone.replace(/[^\\d+]/g, '')
}

function parseLeads(raw: string): LeadRow[] {
  return raw
    .split(/\\r?\\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [phone = '', name = ''] = line.split(/[,\\t]/).map((value) => value.trim())
      return { phone, name }
    })
    .filter((row) => /\\d{6,}/.test(phoneKey(row.phone)))
}

export default function SalesCenterP3() {
  const students = useStore((s) => s.students)
  const { can, allowedLines, actor } = usePerm()
  const canImport = can('sales') === 'operate'
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [fileName, setFileName] = useState('')
  const scope = allowedLines()
  const lines = useMemo(
    () => BUSINESS_LINES.filter((line) => !scope || scope.includes(line)),
    [scope],
  )
  const importedLeads = useMemo(
    () => students.filter((student) => student.channelSource === '线索导入').sort((a, b) => b.registerTime.localeCompare(a.registerTime)),
    [students],
  )

  const openImport = () => {
    form.resetFields()
    setFileName('')
    setOpen(true)
  }

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const raw = await file.text()
    form.setFieldValue('content', raw)
    setFileName(file.name)
  }

  const submit = async () => {
    const value = await form.validateFields()
    const rows = parseLeads(value.content)
    if (!rows.length) {
      message.warning('未识别到有效手机号，请检查导入内容。')
      return
    }
    const existing = new Set(students.map((student) => phoneKey(student.phone ?? '')).filter(Boolean))
    const uniqueRows = rows.filter((row) => {
      const key = phoneKey(row.phone)
      if (existing.has(key)) return false
      existing.add(key)
      return true
    })
    if (!uniqueRows.length) {
      message.warning('所有手机号已存在，未创建新 Leads。')
      return
    }
    const now = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')
    const businessLine = value.businessLine as BusinessLine
    const created: Student[] = uniqueRows.map((row) => ({
      studentId: uid('lead_'),
      name: row.name || '导入 Leads',
      localName: row.name || undefined,
      userType: '正式用户',
      loginMethod: '手机号',
      account: row.phone,
      phone: row.phone,
      businessLine,
      registerChannel: '导入 Leads（静默注册）',
      countryCode: businessLine,
      country: businessLine,
      channelCode: 'IMPORTED_LEAD',
      channelSource: '线索导入',
      registerTime: now,
      status: '未付费-未体验',
      salesProgress: '待领取',
      salesLatestNote: '【静默注册】通过 Leads 导入创建',
      salesUpdatedAt: now,
      salesHistory: [{ progress: '待领取', note: '【静默注册】通过 Leads 导入创建', time: now, owner: actor }],
    }))
    setState((prev) => ({ ...prev, students: [...created, ...prev.students] }))
    message.success('已静默注册 ' + created.length + ' 条 Leads；跳过 ' + (rows.length - created.length) + ' 条重复数据。')
    setOpen(false)
  }

  const columns: ColumnsType<Student> = [
    { title: '用户 ID', dataIndex: 'studentId', width: 180, render: (id) => <Text code>{id}</Text> },
    { title: '姓名', dataIndex: 'localName', width: 150, render: (_value, row) => row.localName || row.name },
    { title: '手机号', dataIndex: 'phone', width: 180 },
    { title: '业务线', dataIndex: 'businessLine', width: 120, render: (line) => <Tag color="magenta">{line}</Tag> },
    { title: '注册方式', dataIndex: 'registerChannel', width: 180 },
    { title: '导入时间', dataIndex: 'registerTime', width: 200, render: (time, row) => <LocalTime time={time} country={row.country || row.businessLine} /> },
    { title: '线索状态', dataIndex: 'salesProgress', width: 120, render: (status) => <Tag color="orange">{status || '待领取'}</Tag> },
  ]

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Alert
        type="info"
        showIcon
        message={<span><Text strong>三期功能 · Leads 导入与静默注册</Text><Tag color="purple" style={{ marginLeft: 8 }}>三期</Tag>导入其他渠道获取的手机号，系统将静默注册为 CRM 用户并进入待领取线索。</span>}
      />
      <Card
        className="page-card"
        bordered={false}
        title={<span className="section-title">销售中心 · Leads 导入</span>}
        extra={canImport ? <Button type="primary" icon={<ImportOutlined />} onClick={openImport}>导入 Leads</Button> : null}
      >
        <Table
          rowKey="studentId"
          columns={columns}
          dataSource={importedLeads}
          scroll={{ x: 1130 }}
          pagination={{ showTotal: (n) => '共 ' + n + ' 条', showSizeChanger: true }}
        />
      </Card>

      <Modal open={open} title="导入 Leads · 静默注册" onCancel={() => setOpen(false)} onOk={submit} okText="确认导入" width={660} destroyOnClose>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="仅导入手机号与姓名；手机号已存在时将自动跳过，不覆盖已有 CRM 用户。"
        />
        <Form form={form} layout="vertical">
          <Form.Item name="businessLine" label="业务线" rules={[{ required: true, message: '请选择业务线' }]}>
            <Select placeholder="请选择业务线" options={lines.map((line) => ({ label: line, value: line }))} />
          </Form.Item>
          <Form.Item label="上传文件（可选）">
            <Input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={readFile} />
            <Text type="secondary" style={{ fontSize: 12 }}>支持 CSV 或 TXT，每行格式：手机号,姓名{fileName ? '；已读取：' + fileName : ''}</Text>
          </Form.Item>
          <Form.Item name="content" label="Leads 数据" rules={[{ required: true, message: '请粘贴或上传 Leads 数据' }]}>
            <Input.TextArea rows={9} placeholder={'手机号,姓名\\n+60123456789,张三\\n+821012345678,Kim'} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
