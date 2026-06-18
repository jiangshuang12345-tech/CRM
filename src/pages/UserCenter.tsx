import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { EditOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { setState, useStore } from '../store'
import { BUSINESS_LINES } from '../types'
import type { Student, UserStatus } from '../types'

const { Text } = Typography

const STATUS_COLOR: Record<UserStatus, string> = {
  注册: 'default',
  体验: 'blue',
  付费: 'green',
  流失: 'red',
}

export default function UserCenter() {
  const students = useStore((s) => s.students)
  const [keyword, setKeyword] = useState('')
  const [lineFilter, setLineFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [editing, setEditing] = useState<Student | null>(null)
  const [form] = Form.useForm()

  const data = useMemo(
    () =>
      students.filter((s) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          s.studentId.toLowerCase().includes(kw) ||
          s.name.toLowerCase().includes(kw) ||
          s.phone.toLowerCase().includes(kw)
        const matchLine = !lineFilter || s.businessLine === lineFilter
        const matchStatus = !statusFilter || s.status === statusFilter
        return matchKw && matchLine && matchStatus
      }),
    [students, keyword, lineFilter, statusFilter],
  )

  const openEdit = (s: Student) => {
    setEditing(s)
    form.setFieldsValue({
      enName: s.enName,
      localName: s.localName,
      gender: s.gender,
      birthday: s.birthday ? dayjs(s.birthday) : undefined,
      businessLine: s.businessLine,
    })
  }

  const submitEdit = async () => {
    const v = await form.validateFields()
    if (!editing) return
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.studentId === editing.studentId
          ? {
              ...s,
              enName: v.enName,
              localName: v.localName,
              gender: v.gender,
              birthday: v.birthday ? v.birthday.format('YYYY-MM-DD') : undefined,
              businessLine: v.businessLine,
            }
          : s,
      ),
    }))
    setEditing(null)
  }

  const columns: ColumnsType<Student> = [
    { title: '学生ID', dataIndex: 'studentId', width: 90, fixed: 'left' },
    {
      title: '学生姓名',
      dataIndex: 'name',
      width: 150,
      render: (_, r) => (
        <div>
          <div>{r.name}</div>
          {r.localName && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.localName}
            </Text>
          )}
        </div>
      ),
    },
    { title: '手机号', dataIndex: 'phone', width: 160 },
    { title: '所属业务线', dataIndex: 'businessLine', width: 110, render: (v) => <Tag color="geekblue">{v}</Tag> },
    { title: '注册渠道', dataIndex: 'registerChannel', width: 160 },
    { title: '注册地国家码', dataIndex: 'countryCode', width: 110 },
    { title: '渠道 code', dataIndex: 'channelCode', width: 200, render: (v) => <Text code>{v}</Text> },
    { title: '注册时间 (Beijing)', dataIndex: 'registerTime', width: 180 },
    {
      title: '用户状态',
      dataIndex: 'status',
      width: 100,
      render: (v: UserStatus) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, r) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
          修改信息
        </Button>
      ),
    },
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">用户中心</span>}>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="学生ID / 姓名 / 手机号"
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder="所属业务线"
          style={{ width: 150 }}
          value={lineFilter}
          onChange={setLineFilter}
          options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))}
        />
        <Select
          allowClear
          placeholder="用户状态"
          style={{ width: 150 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={(['注册', '体验', '付费', '流失'] as UserStatus[]).map((l) => ({ label: l, value: l }))}
        />
      </Space>

      <Table
        rowKey="studentId"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1500 }}
        pagination={{ showTotal: (t) => `共 ${t} 条`, showSizeChanger: true }}
      />

      <Modal
        open={!!editing}
        title={`修改学生信息 · ${editing?.studentId ?? ''}`}
        onCancel={() => setEditing(null)}
        onOk={submitEdit}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 12 }}>
          <Form.Item name="enName" label="英文名">
            <Input placeholder="English name" />
          </Form.Item>
          <Form.Item name="localName" label="本地名">
            <Input placeholder="本地语言姓名" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              allowClear
              placeholder="请选择"
              options={[
                { label: '男', value: '男' },
                { label: '女', value: '女' },
                { label: '其他', value: '其他' },
              ]}
            />
          </Form.Item>
          <Form.Item name="birthday" label="出生年-月-日">
            <DatePicker style={{ width: '100%' }} placeholder="选择出生日期" />
          </Form.Item>
          <Form.Item name="businessLine" label="所属业务线" rules={[{ required: true, message: '请选择业务线' }]}>
            <Select options={BUSINESS_LINES.map((l) => ({ label: l, value: l }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
