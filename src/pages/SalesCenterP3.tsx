import { useMemo, useState } from 'react'
import { Button, Form, Modal, Select, Upload, message } from 'antd'
import { ImportOutlined, InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import SalesCenter from './SalesCenter'
import { setState, uid, useStore } from '../store'
import type { BusinessLine, Student } from '../types'
import { BUSINESS_LINES } from '../types'
import { usePerm } from '../perm'
import { downloadCsv } from '../export'

type LeadRow = { phone: string; name?: string }

function phoneKey(phone: string) {
  return phone.replace(/[^\d+]/g, '')
}

function parseLeads(raw: string): LeadRow[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [phone = '', name = ''] = line.split(/[,\t]/).map((value) => value.trim())
      return { phone, name }
    })
    .filter((row) => /\d{6,}/.test(phoneKey(row.phone)))
}

function LeadImportButton() {
  const students = useStore((s) => s.students)
  const { can, allowedLines, actor } = usePerm()
  const canImport = can('sales') === 'operate'
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [fileName, setFileName] = useState('')
  const scope = allowedLines()
  const lines = useMemo(() => BUSINESS_LINES.filter((line) => !scope || scope.includes(line)), [scope])

  const readFile = async (file: File) => {
    form.setFieldValue('content', await file.text())
    setFileName(file.name)
  }

  const downloadTemplate = () => downloadCsv('Leads导入模板.csv', ['手机号', '姓名'], [])

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

  if (!canImport) return null
  return (
    <>
      <Button icon={<ImportOutlined />} onClick={() => { form.resetFields(); setFileName(''); setOpen(true) }}>导入 Leads</Button>
      <Modal
        open={open}
        title={<span>上传 Leads <Button type="link" size="small" style={{ padding: 0, marginLeft: 6, color: '#ff4d4f' }} onClick={downloadTemplate}>下载模板</Button></span>}
        onCancel={() => setOpen(false)}
        footer={<><Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" onClick={submit}>上传</Button></>}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="businessLine" label="业务线" rules={[{ required: true, message: '请选择业务线' }]}>
            <Select placeholder="请选择业务线" options={lines.map((line) => ({ label: line, value: line }))} />
          </Form.Item>
          <Form.Item name="content" hidden rules={[{ required: true, message: '请上传 Leads 文件' }]}><input /></Form.Item>
          <Form.Item label="上传 leads" required>
            <Upload.Dragger
              accept=".csv,.txt,text/csv,text/plain"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => { void readFile(file); return false }}
              style={{ width: 360 }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#bfc7d5' }} /></p>
              <p className="ant-upload-text">拖动至此处 <span style={{ color: '#ff4d4f' }}>点击上传</span></p>
              <p className="ant-upload-hint">Excel（CSV 格式）</p>
            </Upload.Dragger>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>仅导入手机号与姓名；重复手机号会自动跳过。{fileName ? '已读取：' + fileName : ''}</div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function SalesCenterP3() {
  return <SalesCenter importAction={<LeadImportButton />} />
}
