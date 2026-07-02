import { useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { CheckOutlined, CopyOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { setState, useStore } from '../store'
import type { AppChannel, Student, UserType } from '../types'
import { APP_CHANNELS, USER_TYPES } from '../types'
import { useI18n } from '../i18n'
import { usePerm } from '../perm'
import { isSalesLead } from '../funnel'
import { resolveUserType } from '../userType'
import LocalTime from '../components/LocalTime'

const { Text } = Typography

const APP_CHANNEL_COLOR: Record<AppChannel, string> = {
  'App Store': 'blue',
  'Google Play': 'green',
}
const USER_TYPE_COLOR: Record<UserType, string> = {
  正式用户: 'green',
  测试用户: 'gold',
}

function copyText(txt: string, ok: string) {
  navigator.clipboard?.writeText(txt).then(
    () => message.success(ok),
    () => message.error(txt),
  )
}

export default function SalesFollowup() {
  const { t } = useI18n()
  const students = useStore((s) => s.students)
  const { can, allowedLines } = usePerm()
  const canEdit = can('users') === 'operate'
  const scope = allowedLines()
  const [keyword, setKeyword] = useState('')
  const [countryFilter, setCountryFilter] = useState<string | undefined>()
  const [channelFilter, setChannelFilter] = useState<string | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [followFilter, setFollowFilter] = useState<string | undefined>()

  // 销售跟进线索：已注册未体验 + 有手机号
  const leads = useMemo(() => {
    const inScope = scope ? students.filter((s) => scope.includes(s.businessLine)) : students
    return inScope.filter(isSalesLead)
  }, [students, scope])

  const countries = useMemo(
    () => Array.from(new Set(leads.map((s) => s.country).filter(Boolean))) as string[],
    [leads],
  )

  const data = useMemo(
    () =>
      leads.filter((s) => {
        const kw = keyword.trim().toLowerCase()
        const matchKw =
          !kw ||
          s.studentId.toLowerCase().includes(kw) ||
          (s.localName ?? s.name).toLowerCase().includes(kw) ||
          (s.phone ?? '').toLowerCase().includes(kw)
        const matchCountry = !countryFilter || s.country === countryFilter
        const matchChannel = !channelFilter || s.appChannel === channelFilter
        const matchType = !typeFilter || resolveUserType(s) === typeFilter
        const matchFollow =
          !followFilter ||
          (followFilter === 'done' ? !!s.salesFollowedUp : !s.salesFollowedUp)
        return matchKw && matchCountry && matchChannel && matchType && matchFollow
      }),
    [leads, keyword, countryFilter, channelFilter, typeFilter, followFilter],
  )

  const toggleFollow = (s: Student, done: boolean) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((x) =>
        x.studentId === s.studentId ? { ...x, salesFollowedUp: done } : x,
      ),
    }))
    message.success(done ? t('sales.markedDone') : t('sales.markedPending'))
  }

  const columns: ColumnsType<Student> = [
    { title: t('user.col.id'), dataIndex: 'studentId', width: 190, fixed: 'left' },
    {
      title: t('user.col.name'),
      dataIndex: 'localName',
      width: 130,
      render: (_, r) => <span>{r.localName || r.name}</span>,
    },
    {
      title: t('user.col.phone'),
      dataIndex: 'phone',
      width: 190,
      render: (v: string | undefined) =>
        v ? (
          <Space size={4}>
            <Text strong copyable={false}>
              {v}
            </Text>
            <Tooltip title={t('common.copy')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyText(v, t('common.copied'))}
              />
            </Tooltip>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: t('user.col.userType'),
      dataIndex: 'userType',
      width: 110,
      render: (_: UserType, r: Student) => {
        const tp = resolveUserType(r)
        return <Tag color={USER_TYPE_COLOR[tp]}>{t(`enum.userType.${tp}`)}</Tag>
      },
    },
    {
      title: t('user.col.ageGroup'),
      dataIndex: 'ageGroup',
      width: 100,
      render: (v: string | undefined) => (v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: t('user.col.appChannel'),
      dataIndex: 'appChannel',
      width: 130,
      render: (v: AppChannel | undefined) =>
        v ? <Tag color={APP_CHANNEL_COLOR[v]}>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: t('user.col.country'),
      dataIndex: 'country',
      width: 110,
      render: (v: string | undefined) => (v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: t('user.col.regTime'),
      dataIndex: 'registerTime',
      width: 190,
      render: (v: string | undefined, r: Student) => <LocalTime time={v} country={r.country} />,
    },
    {
      title: t('sales.col.followStatus'),
      dataIndex: 'salesFollowedUp',
      width: 110,
      render: (v: boolean | undefined) =>
        v ? <Tag color="green">{t('sales.status.done')}</Tag> : <Tag color="orange">{t('sales.status.pending')}</Tag>,
    },
    ...(canEdit
      ? [
          {
            title: t('common.action'),
            key: 'action',
            width: 150,
            fixed: 'right' as const,
            render: (_: unknown, r: Student) =>
              r.salesFollowedUp ? (
                <Button type="link" icon={<UndoOutlined />} onClick={() => toggleFollow(r, false)}>
                  {t('sales.markPending')}
                </Button>
              ) : (
                <Button type="link" icon={<CheckOutlined />} onClick={() => toggleFollow(r, true)}>
                  {t('sales.markDone')}
                </Button>
              ),
          },
        ]
      : []),
  ]

  return (
    <Card className="page-card" bordered={false} title={<span className="section-title">{t('sales.title')}</span>}>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('sales.intro')} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('sales.searchPlaceholder')}
          style={{ width: 280 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder={t('sales.col.followStatus')}
          style={{ width: 130 }}
          value={followFilter}
          onChange={setFollowFilter}
          options={[
            { label: t('sales.status.pending'), value: 'pending' },
            { label: t('sales.status.done'), value: 'done' },
          ]}
        />
        <Select
          allowClear
          placeholder={t('user.col.userType')}
          style={{ width: 140 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={USER_TYPES.map((tp) => ({ label: t(`enum.userType.${tp}`), value: tp }))}
        />
        <Select
          allowClear
          placeholder={t('user.col.appChannel')}
          style={{ width: 150 }}
          value={channelFilter}
          onChange={setChannelFilter}
          options={APP_CHANNELS.map((c) => ({ label: c, value: c }))}
        />
        <Select
          allowClear
          placeholder={t('user.col.country')}
          style={{ width: 130 }}
          value={countryFilter}
          onChange={setCountryFilter}
          options={countries.map((c) => ({ label: c, value: c }))}
        />
      </Space>

      <Table
        rowKey="studentId"
        columns={columns}
        dataSource={data}
        scroll={{ x: 1590 }}
        pagination={{ showTotal: (n) => t('common.total', { n }), showSizeChanger: true }}
      />
    </Card>
  )
}
