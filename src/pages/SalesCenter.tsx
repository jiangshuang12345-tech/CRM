import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd'
import { CheckOutlined, EditOutlined, PhoneOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { genCallId, setState, useStore } from '../store'
import type { CallRecord, CallResult, SalesFollowLog, Student, UserType } from '../types'
import { CALL_RESULTS } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { isClaimedLead, isPoolLead, isSalesLead } from '../funnel'
import { resolveUserType } from '../userType'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

const CALL_RESULT_COLOR: Record<CallResult, string> = {
  已接通: 'green',
  无人接听: 'red',
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const USER_TYPE_COLOR: Record<UserType, string> = {
  正式用户: 'green',
  测试用户: 'gold',
}

// 跟进进度标签配色
const PROGRESS_COLOR: Record<string, string> = {
  待领取: 'orange',
  跟进中: 'blue',
  暂不跟进: 'default',
  已付费: 'green',
}

// 更新跟进弹窗里可选的进度
const FOLLOW_PROGRESS = ['跟进中', '已付费', '暂不跟进'] as const

export default function SalesCenter() {
  const { t } = useI18n()
  const students = useStore((s) => s.students)
  const lessons = useStore((s) => s.lessons ?? [])
  const callRecords = useStore((s) => s.callRecords ?? [])
  const { can, allowedLines, actor } = usePerm()
  const canEdit = can('sales') === 'operate'
  const scope = allowedLines()
  const seeAllOwners = scope === null // 全业务线（超管）可见全部领取记录

  const [tab, setTab] = useState('pool')
  const [poolKw, setPoolKw] = useState('')
  const [poolLine, setPoolLine] = useState<string | undefined>()
  const [followKw, setFollowKw] = useState('')
  const [progressFilter, setProgressFilter] = useState<string | undefined>()
  const [callKw, setCallKw] = useState('')
  const [callResultFilter, setCallResultFilter] = useState<string | undefined>()

  const [editing, setEditing] = useState<Student | null>(null)
  const [dialing, setDialing] = useState<Student | null>(null)
  const [form] = Form.useForm()
  const watchProgress = Form.useWatch('progress', form) as string | undefined

  const scoped = useMemo(
    () => (scope ? students.filter((s) => scope.includes(s.businessLine)) : students),
    [students, scope],
  )

  const poolAll = useMemo(() => scoped.filter((s) => isPoolLead(s, lessons)), [scoped, lessons])
  const followAll = useMemo(
    () => scoped.filter((s) => isClaimedLead(s, lessons)).filter((s) => seeAllOwners || s.salesOwner === actor),
    [scoped, lessons, seeAllOwners, actor],
  )

  // 业务线筛选项来源于当前列表实际包含的业务线数据
  const lines = useMemo(
    () => Array.from(new Set(poolAll.map((s) => s.businessLine).filter(Boolean))) as string[],
    [poolAll],
  )

  const leadText = (s: Student) =>
    `${s.phone ?? ''} ${s.studentId} ${s.localName ?? s.name} ${s.country ?? ''} ${s.channelSource ?? ''} ${s.salesLatestNote ?? ''}`.toLowerCase()

  const poolData = useMemo(
    () =>
      poolAll.filter((s) => {
        const kw = poolKw.trim().toLowerCase()
        return (!kw || leadText(s).includes(kw)) && (!poolLine || s.businessLine === poolLine)
      }),
    [poolAll, poolKw, poolLine],
  )

  const followData = useMemo(
    () =>
      followAll.filter((s) => {
        const kw = followKw.trim().toLowerCase()
        return (!kw || leadText(s).includes(kw)) && (!progressFilter || s.salesProgress === progressFilter)
      }),
    [followAll, followKw, progressFilter],
  )

  // 通话记录：受数据范围限制，非超管仅看自己坐席的记录
  const callScoped = useMemo(() => {
    let list = scope ? callRecords.filter((c) => scope.includes(c.businessLine)) : callRecords
    if (!seeAllOwners) list = list.filter((c) => c.agent === actor)
    return list
  }, [callRecords, scope, seeAllOwners, actor])

  const callData = useMemo(
    () =>
      callScoped.filter((c) => {
        const kw = callKw.trim().toLowerCase()
        const text = `${c.phone} ${c.studentId} ${c.customer} ${c.note}`.toLowerCase()
        return (!kw || text.includes(kw)) && (!callResultFilter || c.result === callResultFilter)
      }),
    [callScoped, callKw, callResultFilter],
  )

  const claim = (s: Student) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const note = t('sales.claimNote')
    setState((prev) => ({
      ...prev,
      students: prev.students.map((x) =>
        x.studentId === s.studentId
          ? {
              ...x,
              salesOwner: actor,
              salesProgress: '跟进中',
              salesLatestNote: note,
              salesUpdatedAt: now,
              salesHistory: [{ progress: '跟进中', note, time: now, owner: actor }, ...(x.salesHistory || [])],
            }
          : x,
      ),
    }))
    message.success(t('sales.claimed', { phone: s.phone ?? '' }))
    setTab('follow')
  }

  const openFollow = (s: Student) => {
    setEditing(s)
    form.setFieldsValue({
      progress: s.salesProgress || '跟进中',
      nextFollow: s.salesNextFollow ? dayjs(s.salesNextFollow) : undefined,
      note: '',
    })
  }

  const saveFollow = async () => {
    const v = await form.validateFields()
    if (!editing) return
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const progress = v.progress as string
    const note = (v.note as string).trim()
    const nextFollow = v.nextFollow ? v.nextFollow.format('YYYY-MM-DD HH:mm:ss') : ''
    const converted = progress === '已付费'
    const owner = editing.salesOwner ?? actor
    setState((prev) => ({
      ...prev,
      students: prev.students.map((x) =>
        x.studentId === editing.studentId
          ? {
              ...x,
              // 转「已付费」→ 改写用户状态为付费，离开销售中心进入用户中心
              status: progress === '已付费' ? '付费' : x.status,
              salesProgress: converted ? x.salesProgress : (progress as Student['salesProgress']),
              salesLatestNote: note,
              salesNextFollow: nextFollow,
              salesUpdatedAt: now,
              salesHistory: [{ progress, note, time: now, owner }, ...(x.salesHistory || [])],
            }
          : x,
      ),
    }))
    setEditing(null)
    message.success(converted ? t('sales.converted') : t('sales.saved'))
  }

  // 保存外呼通话小结：生成通话记录 + 归档到该线索的销售跟进记录
  const saveCall = (result: CallResult, duration: string, rawNote: string) => {
    if (!dialing) return
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const note = `${t('sales.dial.autoNote')}${rawNote.trim()}`
    const owner = dialing.salesOwner ?? actor
    const record: CallRecord = {
      id: genCallId(),
      studentId: dialing.studentId,
      customer: dialing.localName || dialing.name,
      phone: dialing.phone ?? '',
      businessLine: dialing.businessLine,
      result,
      duration,
      note,
      agent: actor,
      time: now,
    }
    setState((prev) => ({
      ...prev,
      callRecords: [record, ...prev.callRecords],
      students: prev.students.map((x) =>
        x.studentId === dialing.studentId
          ? {
              ...x,
              salesLatestNote: note,
              salesUpdatedAt: now,
              salesHistory: [
                { progress: x.salesProgress || '跟进中', note, time: now, owner },
                ...(x.salesHistory || []),
              ],
            }
          : x,
      ),
    }))
    setDialing(null)
    message.success(t('sales.dialed'))
  }

  const typeCol = {
    title: t('user.col.userType'),
    dataIndex: 'userType',
    width: 100,
    render: (_: UserType, r: Student) => {
      const tp = resolveUserType(r)
      return <Tag color={USER_TYPE_COLOR[tp]}>{t(`enum.userType.${tp}`)}</Tag>
    },
  }
  // 基于「用户中心-二期」字段（不含 用户状态 / 到期时间 / 最近修改人 / 注册方式 / 渠道 code）
  const userColumns: ColumnsType<Student> = [
    { title: t('user.col.id'), dataIndex: 'studentId', width: 190, fixed: 'left' },
    { title: t('user.col.name'), dataIndex: 'localName', width: 140, render: (_, r) => r.localName || r.name },
    typeCol,
    {
      title: t('user.col.ageGroup'),
      dataIndex: 'ageGroup',
      width: 100,
      render: (v: string | undefined) => (v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>),
    },
    { title: t('user.col.account'), dataIndex: 'account', width: 200, render: (v) => <Text>{v}</Text> },
    { title: t('user.col.line'), dataIndex: 'businessLine', width: 110, render: (v) => <Tag>{v}</Tag> },
    {
      title: t('user.col.channel'),
      dataIndex: 'registerChannel',
      width: 220,
      render: (v: string, r) => `${r.businessLine} · ${v}`,
    },
    {
      title: t('user.col.regTime'),
      dataIndex: 'registerTime',
      width: 200,
      render: (v: string | undefined, r: Student) => <LocalTime time={v} country={r.country || r.businessLine} />,
    },
  ]

  const poolColumns: ColumnsType<Student> = [
    ...userColumns,
    ...(canEdit
      ? [
          {
            title: t('common.action'),
            key: 'op',
            width: 120,
            fixed: 'right' as const,
            render: (_: unknown, r: Student) => (
              <Button type="link" icon={<CheckOutlined />} onClick={() => claim(r)}>
                {t('sales.claim')}
              </Button>
            ),
          },
        ]
      : []),
  ]

  const followColumns: ColumnsType<Student> = [
    ...userColumns,
    {
      title: t('sales.col.progress'),
      dataIndex: 'salesProgress',
      width: 100,
      render: (v: string | undefined) => (v ? <Tag color={PROGRESS_COLOR[v]}>{t(`sales.progress.${v}`)}</Tag> : '—'),
    },
    {
      title: t('sales.col.latestNote'),
      dataIndex: 'salesLatestNote',
      width: 220,
      ellipsis: true,
      render: (v: string | undefined) => v || <Text type="secondary">—</Text>,
    },
    { title: t('sales.col.nextFollow'), dataIndex: 'salesNextFollow', width: 170, render: (v) => v || <Text type="secondary">—</Text> },
    { title: t('sales.col.updatedAt'), dataIndex: 'salesUpdatedAt', width: 170, render: (v) => v || <Text type="secondary">—</Text> },
    { title: t('sales.col.owner'), dataIndex: 'salesOwner', width: 190, render: (v) => v || <Text type="secondary">—</Text> },
    ...(canEdit
      ? [
          {
            title: t('common.action'),
            key: 'op',
            width: 180,
            fixed: 'right' as const,
            render: (_: unknown, r: Student) => (
              <Space size={0}>
                <Button type="link" icon={<PhoneOutlined />} disabled={!r.phone} onClick={() => setDialing(r)}>
                  {t('sales.dial')}
                </Button>
                <Button type="link" icon={<EditOutlined />} onClick={() => openFollow(r)}>
                  {t('sales.update')}
                </Button>
              </Space>
            ),
          },
        ]
      : []),
  ]

  const callColumns: ColumnsType<CallRecord> = [
    { title: t('sales.call.time'), dataIndex: 'time', width: 180 },
    { title: t('sales.call.customer'), dataIndex: 'customer', width: 140 },
    { title: t('user.col.phone'), dataIndex: 'phone', width: 160 },
    { title: t('user.col.line'), dataIndex: 'businessLine', width: 100, render: (v) => <Tag>{v}</Tag> },
    {
      title: t('sales.call.result'),
      dataIndex: 'result',
      width: 110,
      render: (v: CallResult) => <Tag color={CALL_RESULT_COLOR[v]}>{t(`sales.callResult.${v}`)}</Tag>,
    },
    { title: t('sales.call.duration'), dataIndex: 'duration', width: 90 },
    {
      title: t('sales.call.note'),
      dataIndex: 'note',
      width: 340,
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    { title: t('sales.call.agent'), dataIndex: 'agent', width: 190 },
  ]

  const totalLeads = scoped.filter((s) => isSalesLead(s, lessons)).length

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">{t('sales.title')}</span>}>
      <Alert type="warning" showIcon message={t('phase3.banner')} style={{ marginBottom: 16 }} />
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('sales.flow')} description={t('sales.intro')} />

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'pool',
            label: `${t('sales.tab.pool')} (${poolAll.length})`,
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={t('sales.searchPool')}
                    style={{ width: 320 }}
                    value={poolKw}
                    onChange={(e) => setPoolKw(e.target.value)}
                  />
                  <Select
                    allowClear
                    placeholder={t('user.col.line')}
                    style={{ width: 140 }}
                    value={poolLine}
                    onChange={setPoolLine}
                    options={lines.map((c) => ({ label: c, value: c }))}
                  />
                </Space>
                <Table
                  rowKey="studentId"
                  columns={poolColumns}
                  dataSource={poolData}
                  scroll={{ x: 1280 }}
                  locale={{ emptyText: t('sales.emptyPool') }}
                  pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
                />
              </>
            ),
          },
          {
            key: 'follow',
            label: `${t('sales.tab.follow')} (${followAll.length})`,
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={t('sales.searchFollow')}
                    style={{ width: 340 }}
                    value={followKw}
                    onChange={(e) => setFollowKw(e.target.value)}
                  />
                  <Select
                    allowClear
                    placeholder={t('sales.col.progress')}
                    style={{ width: 150 }}
                    value={progressFilter}
                    onChange={setProgressFilter}
                    options={(['跟进中', '暂不跟进'] as const).map((p) => ({ label: t(`sales.progress.${p}`), value: p }))}
                  />
                </Space>
                <Table
                  rowKey="studentId"
                  columns={followColumns}
                  dataSource={followData}
                  scroll={{ x: 2190 }}
                  locale={{ emptyText: t('sales.emptyFollow') }}
                  pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
                />
              </>
            ),
          },
          {
            key: 'calls',
            label: `${t('sales.tab.calls')} (${callScoped.length})`,
            children: (
              <>
                <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('sales.callsBanner')} />
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={t('sales.searchCalls')}
                    style={{ width: 340 }}
                    value={callKw}
                    onChange={(e) => setCallKw(e.target.value)}
                  />
                  <Select
                    allowClear
                    placeholder={t('sales.call.result')}
                    style={{ width: 150 }}
                    value={callResultFilter}
                    onChange={setCallResultFilter}
                    options={CALL_RESULTS.map((r) => ({ label: t(`sales.callResult.${r}`), value: r }))}
                  />
                </Space>
                <Table
                  rowKey="id"
                  columns={callColumns}
                  dataSource={callData}
                  scroll={{ x: 1310 }}
                  locale={{ emptyText: t('sales.emptyCalls') }}
                  pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
                />
              </>
            ),
          },
        ]}
      />

      <div style={{ marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('sales.totalTip', { n: totalLeads })}
        </Text>
      </div>

      <Modal_Follow
        t={t}
        editing={editing}
        form={form}
        watchProgress={watchProgress}
        onCancel={() => setEditing(null)}
        onOk={saveFollow}
      />

      <Modal_Dial t={t} dialing={dialing} onCancel={() => setDialing(null)} onSave={saveCall} />
    </Card>
  )
}

// 外呼弹窗：模拟发起呼叫 → 挂断后填写通话小结
function Modal_Dial({
  t,
  dialing,
  onCancel,
  onSave,
}: {
  t: (k: string, v?: Record<string, string | number>) => string
  dialing: Student | null
  onCancel: () => void
  onSave: (result: CallResult, duration: string, note: string) => void
}) {
  const [phase, setPhase] = useState<'calling' | 'summary'>('calling')
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<CallResult>('已接通')
  const [note, setNote] = useState('')

  // 打开弹窗时重置状态并开始计时
  useEffect(() => {
    if (dialing) {
      setPhase('calling')
      setSeconds(0)
      setResult('已接通')
      setNote('')
    }
  }, [dialing])

  useEffect(() => {
    if (!dialing || phase !== 'calling') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [dialing, phase])

  const duration = result === '无人接听' ? '—' : fmtDuration(seconds)

  const submit = () => {
    if (!note.trim()) {
      message.warning(t('sales.dial.noteRequired'))
      return
    }
    onSave(result, duration, note)
  }

  return (
    <Modal
      open={!!dialing}
      title={t('sales.dial.title', { name: dialing?.localName || dialing?.name || '' })}
      onCancel={onCancel}
      width={520}
      destroyOnClose
      footer={
        phase === 'calling'
          ? [
              <Button key="hangup" danger type="primary" icon={<PhoneOutlined />} onClick={() => setPhase('summary')}>
                {t('sales.dial.hangup')}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={onCancel}>
                {t('common.cancel')}
              </Button>,
              <Button key="save" type="primary" onClick={submit}>
                {t('sales.dial.save')}
              </Button>,
            ]
      }
    >
      <div style={{ padding: '4px 0 12px' }}>
        <div style={{ fontSize: 15 }}>
          <Text strong>{dialing?.localName || dialing?.name}</Text>
          <Tag style={{ marginInlineStart: 8 }}>{dialing?.businessLine}</Tag>
        </div>
        <div style={{ color: '#8c8c8c', marginTop: 4 }}>
          <PhoneOutlined /> {dialing?.phone}
        </div>
      </div>

      {phase === 'calling' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ color: '#52c41a', marginBottom: 8 }}>{t('sales.dial.connected')}</div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 2 }}>{fmtDuration(seconds)}</div>
        </div>
      ) : (
        <Form layout="vertical" style={{ marginTop: 4 }}>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t('sales.dial.summaryTip')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label={t('sales.call.result')}>
              <Select
                value={result}
                onChange={(v) => setResult(v)}
                options={CALL_RESULTS.map((r) => ({ label: t(`sales.callResult.${r}`), value: r }))}
              />
            </Form.Item>
            <Form.Item label={t('sales.call.duration')}>
              <Input value={duration} disabled />
            </Form.Item>
          </div>
          <Form.Item label={t('sales.call.note')} required>
            <Input.TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('sales.f.notePlaceholder')} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

// 更新跟进弹窗
function Modal_Follow({
  t,
  editing,
  form,
  watchProgress,
  onCancel,
  onOk,
}: {
  t: (k: string, v?: Record<string, string | number>) => string
  editing: Student | null
  form: ReturnType<typeof Form.useForm>[0]
  watchProgress?: string
  onCancel: () => void
  onOk: () => void
}) {
  const converted = watchProgress === '已体验' || watchProgress === '已付费'
  const history: SalesFollowLog[] = editing?.salesHistory ?? []
  return (
    <ModalWrapper open={!!editing} title={t('sales.modal.title')} onCancel={onCancel} onOk={onOk} okText={t('sales.saveFollow')} cancelText={t('common.cancel')}>
      <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item label={t('user.col.phone')}>
            <Input value={editing?.phone} disabled />
          </Form.Item>
          <Form.Item label={t('sales.f.owner')}>
            <Input value={editing?.salesOwner} disabled />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="progress" label={t('sales.col.progress')} rules={[{ required: true }]}>
            <Select options={FOLLOW_PROGRESS.map((p) => ({ label: t(`sales.progress.${p}`), value: p }))} />
          </Form.Item>
          <Form.Item name="nextFollow" label={t('sales.f.nextFollow')}>
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
        </div>
        <Form.Item name="note" label={t('sales.f.note')} rules={[{ required: true, message: t('sales.f.noteRequired') }]}>
          <Input.TextArea rows={3} placeholder={t('sales.f.notePlaceholder')} />
        </Form.Item>
      </Form>
      {converted && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t('sales.convertTip')} />}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        <Text strong>{t('sales.history')}</Text>
        <div style={{ marginTop: 12 }}>
          {history.length ? (
            <Timeline
              items={history.map((h) => ({
                color: PROGRESS_COLOR[h.progress] === 'default' ? 'gray' : PROGRESS_COLOR[h.progress],
                children: (
                  <div>
                    <Text strong>{t(`sales.progress.${h.progress}`)}</Text> · {h.note}
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                      {h.time} · {h.owner}
                    </div>
                  </div>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">{t('sales.history.empty')}</Text>
          )}
        </div>
      </div>
    </ModalWrapper>
  )
}

// 轻量 Modal 包装
function ModalWrapper(props: {
  open: boolean
  title: string
  onCancel: () => void
  onOk: () => void
  okText: string
  cancelText: string
  children: ReactNode
}) {
  return (
    <Modal
      open={props.open}
      title={props.title}
      onCancel={props.onCancel}
      onOk={props.onOk}
      okText={props.okText}
      cancelText={props.cancelText}
      width={640}
      destroyOnClose
    >
      {props.children}
    </Modal>
  )
}
