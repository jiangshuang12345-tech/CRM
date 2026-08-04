import { useMemo, useState } from 'react'
import {
  Alert, Badge, Button, Card, Col, Descriptions, Drawer, Empty, Form, Input, Modal,
  Progress, Row, Select, Space, Statistic, Steps, Switch, Table, Tabs, Tag, Timeline,
  Typography, message,
} from 'antd'
import {
  ApiOutlined, BarChartOutlined, BellOutlined, BranchesOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExperimentOutlined, MailOutlined, PlusOutlined, SafetyCertificateOutlined,
  SendOutlined, TagsOutlined, ThunderboltOutlined, UsergroupAddOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

type Segment = { key: string; name: string; rule: string; users: number; updated: string; status: string }
type Template = { key: string; name: string; channel: string; language: string; variables: string[]; status: string }
type Journey = { key: string; name: string; trigger: string; conversion: string; users: number; rate: string; status: string }

const phaseTag = <Tag color="cyan" style={{ marginInlineStart: 8 }}>四期</Tag>

const seedSegments: Segment[] = [
  { key: 's1', name: '注册24小时未开始试用', rule: '正式用户 AND 注册>24h AND 试用=未开始 AND 订阅≠生效中', users: 1280, updated: '5 分钟前', status: '动态更新' },
  { key: 's2', name: '试用中未开始第一课', rule: '试用=进行中 AND 第一课=未开始 AND 有效Push Token', users: 462, updated: '8 分钟前', status: '动态更新' },
  { key: 's3', name: '支付失败待挽回', rule: '支付=失败 AND 发生时间<48h AND 订阅≠生效中', users: 96, updated: '12 分钟前', status: '动态更新' },
  { key: 's4', name: '全局触达排除人群', rule: '测试用户 OR 内部员工 OR 已退订 OR 无营销授权', users: 218, updated: '1 分钟前', status: '系统人群' },
]

const seedTemplates: Template[] = [
  { key: 't1', name: '开启你的7天学习体验', channel: 'Push', language: '中文 / 英文', variables: ['用户姓名', '试用天数', 'Deep Link'], status: '已发布' },
  { key: 't2', name: '为你推荐第一节课', channel: 'Email', language: '中文 / 英文 / 越南语', variables: ['用户姓名', '课程名称', '课程图片'], status: '已发布' },
  { key: 't3', name: '继续未完成的课程', channel: 'Push', language: '中文 / 英文', variables: ['未完成课程', '学习进度'], status: '草稿' },
  { key: 't4', name: '支付失败帮助', channel: 'Email', language: '中文 / 英文', variables: ['用户姓名', '付款链接', '客服邮箱'], status: '待审核' },
]

const seedJourneys: Journey[] = [
  { key: 'j1', name: '注册 → 开启试用', trigger: 'registration_completed', conversion: 'trial_started', users: 1280, rate: '18.6%', status: '运行中' },
  { key: 'j2', name: '试用 → 第一节课', trigger: 'trial_started', conversion: 'trial_lesson_started', users: 462, rate: '31.2%', status: '运行中' },
  { key: 'j3', name: '未完课召回', trigger: 'trial_lesson_started', conversion: 'trial_lesson_completed', users: 205, rate: '24.8%', status: '草稿' },
  { key: 'j4', name: '支付失败挽回', trigger: 'payment_failed', conversion: 'payment_succeeded', users: 96, rate: '12.4%', status: '待审核' },
]

const eventRows = [
  ['registration_completed', '注册完成', 'P0', 'uid · occurred_at · country · source', '正常'],
  ['trial_started', '试用开始', 'P0', 'trial_id · plan · source', '正常'],
  ['trial_lesson_started', '试用课开始', 'P0', 'lesson_id · course_level', '正常'],
  ['trial_lesson_completed', '试用课完成', 'P0', 'lesson_id · duration · progress', '正常'],
  ['payment_failed', '支付失败', 'P0', 'order_id · channel · reason', '轻微延迟'],
  ['payment_succeeded', '支付成功', 'P0', 'order_id · amount · currency', '正常'],
  ['subscription_renewed', '订阅续费', 'P1', 'plan · billing_cycle · renewed_at', '正常'],
  ['app_session_started', 'App 启动', 'P1', 'platform · app_version', '正常'],
].map((r, i) => ({ key: i, event: r[0], name: r[1], priority: r[2], props: r[3], health: r[4] }))

function Status({ value }: { value: string }) {
  const color = value === '运行中' || value === '已发布' || value === '正常' || value === '动态更新'
    ? 'green' : value === '草稿' ? 'default' : value === '轻微延迟' ? 'orange' : 'blue'
  return <Tag color={color}>{value}</Tag>
}

function PhaseBanner() {
  return (
    <Alert
      showIcon
      icon={<ThunderboltOutlined />}
      type="info"
      message={<span><b>四期规划功能 · 生命周期运营自动化</b>　从“圈人发消息”升级为“行为触发—多渠道触达—转化退出—效果验证”的完整闭环。</span>}
      style={{ marginBottom: 16, borderColor: '#91e8e8', background: 'linear-gradient(100deg,#f0fffe,#f6fbff)' }}
    />
  )
}

export default function LifecycleAutomation() {
  const [active, setActive] = useState('overview')
  const [segments, setSegments] = useState(seedSegments)
  const [templates, setTemplates] = useState(seedTemplates)
  const [journeys, setJourneys] = useState(seedJourneys)
  const [createType, setCreateType] = useState<'segment' | 'template' | 'journey' | null>(null)
  const [journeyOpen, setJourneyOpen] = useState(false)
  const [form] = Form.useForm()

  const submit = () => {
    form.validateFields().then((v) => {
      if (createType === 'segment') setSegments((x) => [...x, { key: Date.now().toString(), name: v.name, rule: v.rule, users: 0, updated: '刚刚', status: '动态更新' }])
      if (createType === 'template') setTemplates((x) => [...x, { key: Date.now().toString(), name: v.name, channel: v.channel, language: v.language || '中文', variables: v.variables || [], status: '草稿' }])
      if (createType === 'journey') setJourneys((x) => [...x, { key: Date.now().toString(), name: v.name, trigger: v.trigger, conversion: v.conversion, users: 0, rate: '—', status: '草稿' }])
      message.success('已创建并保存为草稿')
      setCreateType(null)
      form.resetFields()
    })
  }

  const header = (
    <>
      <PhaseBanner />
      <div className="lifecycle-hero">
        <div>
          <Space size={8}><Text className="eyebrow">LIFECYCLE ORCHESTRATION</Text>{phaseTag}</Space>
          <Title level={2} style={{ margin: '8px 0 6px' }}>把每一个用户信号，转化成下一步行动</Title>
          <Paragraph style={{ maxWidth: 760, margin: 0, color: '#536274' }}>
            统一管理用户属性、行为事件、动态人群、消息模板与自动化旅程；在发送前重新校验后端状态，用户完成目标后立即退出。
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ExperimentOutlined />} onClick={() => setActive('analytics')}>查看实验效果</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('journey'); form.resetFields() }}>创建自动化旅程</Button>
        </Space>
      </div>
    </>
  )

  const overview = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={14}>
        {[['运行中旅程', '4', <BranchesOutlined />], ['动态人群', '12,480', <UsergroupAddOutlined />], ['今日触达', '3,286', <SendOutlined />], ['增量转化', '+2.3pp', <BarChartOutlined />]].map((x) => (
          <Col span={6} key={x[0] as string}><Card className="metric-card"><Space align="start"><div className="metric-icon">{x[2]}</div><Statistic title={x[0]} value={x[1] as string} /></Space></Card></Col>
        ))}
      </Row>
      <Card title="五个优先生命周期旅程" extra={<Button type="link" onClick={() => setActive('journeys')}>管理全部旅程 →</Button>}>
        <Steps
          responsive={false}
          items={[
            ['注册', '启动试用'], ['第一课', '开始课程'], ['首个价值', '完成课程'], ['转化', '订阅付费'], ['支付挽回', '支付成功'],
          ].map((x, i) => ({ title: x[0], description: <><Text>{x[1]}</Text><br/><Tag color={i < 2 ? 'green' : 'blue'}>{i < 2 ? '运行中' : '规划中'}</Tag></> }))}
        />
      </Card>
      <Row gutter={14}>
        <Col span={15}>
          <Card title="实时旅程表现" extra={<Badge status="processing" text="实时更新" />}>
            {journeys.slice(0, 3).map((j) => <div className="journey-row" key={j.key}><div><b>{j.name}</b><div className="subtle">{j.trigger} → {j.conversion}</div></div><div className="journey-progress"><Progress percent={Number(j.rate.replace('%','')) || 0} strokeColor="#13a8a8" size="small" /><Text strong>{j.rate}</Text></div><Status value={j.status} /></div>)}
          </Card>
        </Col>
        <Col span={9}>
          <Card title="全局治理规则">
            <Timeline items={[
              { color: 'green', children: <><b>后端状态优先</b><div className="subtle">每次商业触达前重新校验</div></> },
              { color: 'blue', children: <><b>转化立即退出</b><div className="subtle">付费/试用后停止过期消息</div></> },
              { color: 'orange', children: <><b>授权与频控</b><div className="subtle">静默时间 + 每日最多2次</div></> },
              { color: 'purple', children: <><b>保留留白对照组</b><div className="subtle">验证真实增量价值</div></> },
            ]} />
          </Card>
        </Col>
      </Row>
    </Space>
  )

  const segmentTab = (
    <Card title={<Space><TagsOutlined />动态人群与用户标签{phaseTag}</Space>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('segment'); form.resetFields() }}>创建动态人群</Button>}>
      <Alert message="用户类型、试用/订阅/支付状态作为后端同步属性；运营标签由属性 + 行为 + 时间窗口组合计算，用户状态变化后自动进入或退出。" type="info" showIcon style={{ marginBottom: 16 }} />
      <Table pagination={false} dataSource={segments} columns={[
        { title: '人群名称', dataIndex: 'name', render: (v) => <b>{v}</b> },
        { title: '组合规则', dataIndex: 'rule', width: '42%', render: (v) => <Text code>{v}</Text> },
        { title: '预计人数', dataIndex: 'users', render: (v) => v.toLocaleString() },
        { title: '更新时间', dataIndex: 'updated' },
        { title: '状态', dataIndex: 'status', render: (v) => <Status value={v} /> },
        { title: '操作', render: () => <Space><Button type="link" size="small">编辑规则</Button><Button type="link" size="small">查看用户</Button></Space> },
      ]} />
    </Card>
  )

  const eventsTab = (
    <Card title={<Space><ApiOutlined />事件中心与数据健康{phaseTag}</Space>} extra={<Space><Badge status="success" text="近1小时接入成功率 99.7%"/><Button>查看接入文档</Button></Space>}>
      <Row gutter={14} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="今日事件量" value={128640} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="平均延迟" value={1.8} suffix="秒" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="数据差异" value={0.6} suffix="%" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="去重事件" value={382} /></Card></Col>
      </Row>
      <Table pagination={false} dataSource={eventRows} columns={[
        { title: '事件名称', dataIndex: 'event', render: (v) => <Text code>{v}</Text> }, { title: '业务含义', dataIndex: 'name' },
        { title: '优先级', dataIndex: 'priority', render: (v) => <Tag color={v === 'P0' ? 'red' : 'blue'}>{v}</Tag> },
        { title: '关键属性', dataIndex: 'props' }, { title: '数据健康', dataIndex: 'health', render: (v) => <Status value={v} /> },
        { title: '操作', render: () => <Button type="link" size="small">查看样例</Button> },
      ]} />
    </Card>
  )

  const templatesTab = (
    <Card title={<Space><MailOutlined />消息模板{phaseTag}</Space>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('template'); form.resetFields() }}>创建模板</Button>}>
      <Table pagination={false} dataSource={templates} columns={[
        { title: '模板名称', dataIndex: 'name', render: (v) => <b>{v}</b> },
        { title: '渠道', dataIndex: 'channel', render: (v) => <Tag icon={v === 'Email' ? <MailOutlined /> : <BellOutlined />} color={v === 'Email' ? 'blue' : 'cyan'}>{v}</Tag> },
        { title: '语言版本', dataIndex: 'language' },
        { title: '动态字段', dataIndex: 'variables', render: (vs: string[]) => <Space wrap>{vs.map(v => <Tag key={v}>{`{{${v}}}`}</Tag>)}</Space> },
        { title: '状态', dataIndex: 'status', render: (v) => <Status value={v} /> },
        { title: '操作', render: () => <Space><Button type="link" size="small">预览</Button><Button type="link" size="small">测试发送</Button><Button type="link" size="small">复制</Button></Space> },
      ]} />
    </Card>
  )

  const journeysTab = (
    <Card title={<Space><BranchesOutlined />自动化旅程{phaseTag}</Space>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateType('journey'); form.resetFields() }}>创建旅程</Button>}>
      <Alert message="旅程发布前必须配置进入条件、发送前状态复核、转化事件、退出条件、频控与实验对照组。" type="warning" showIcon style={{ marginBottom: 16 }} />
      <Table pagination={false} dataSource={journeys} columns={[
        { title: '旅程名称', dataIndex: 'name', render: (v) => <b>{v}</b> },
        { title: '进入事件', dataIndex: 'trigger', render: (v) => <Text code>{v}</Text> },
        { title: '转化/退出事件', dataIndex: 'conversion', render: (v) => <Text code>{v}</Text> },
        { title: '进入人数', dataIndex: 'users', render: (v) => v.toLocaleString() }, { title: '转化率', dataIndex: 'rate', render: (v) => <Text strong>{v}</Text> },
        { title: '状态', dataIndex: 'status', render: (v) => <Status value={v} /> },
        { title: '操作', render: () => <Space><Button type="link" size="small" onClick={() => setJourneyOpen(true)}>查看画布</Button><Button type="link" size="small">复制</Button></Space> },
      ]} />
    </Card>
  )

  const campaignsTab = (
    <Card title={<Space><SendOutlined />Campaign 管理{phaseTag}</Space>} extra={<Button type="primary" icon={<PlusOutlined />}>创建 Campaign</Button>}>
      <Descriptions bordered column={4} size="small" style={{ marginBottom: 16 }} items={[
        { key: '1', label: '发送方式', children: '立即 / 预约 / 用户时区' }, { key: '2', label: '支持渠道', children: 'Push + Email' },
        { key: '3', label: '发送前检查', children: '授权、频控、状态复核' }, { key: '4', label: '审批', children: 'Maker–Checker' },
      ]} />
      <Table pagination={false} dataSource={[
        { key: 1, name: '越南用户试用召回 08/04', audience: '注册24小时未试用', channel: 'Push + Email', send: '2026-08-04 20:00（用户时区）', delivered: '2,846 / 3,012', conversion: '15.8%', status: '发送中' },
        { key: 2, name: '周末第一课推荐', audience: '试用中未开始第一课', channel: 'Push', send: '2026-08-08 10:00', delivered: '—', conversion: '—', status: '待审核' },
        { key: 3, name: '支付失败帮助 A/B', audience: '支付失败待挽回', channel: 'Email', send: '事件后 30 分钟', delivered: '88 / 96', conversion: '12.4%', status: '已完成' },
      ]} columns={[
        { title: 'Campaign', dataIndex: 'name', render: v => <b>{v}</b> }, { title: '目标人群', dataIndex: 'audience' }, { title: '渠道', dataIndex: 'channel' },
        { title: '发送时间', dataIndex: 'send' }, { title: '送达', dataIndex: 'delivered' }, { title: '转化', dataIndex: 'conversion' },
        { title: '状态', dataIndex: 'status', render: v => <Status value={v} /> }, { title: '操作', render: () => <Button type="link" size="small">查看报告</Button> },
      ]} />
    </Card>
  )

  const analyticsTab = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={14}>
        <Col span={6}><Card><Statistic title="消息送达率" value={96.8} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="Deep Link 打开率" value={21.4} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="产品转化率" value={18.6} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="相对对照组提升" value={2.3} prefix="+" suffix="pp" valueStyle={{ color: '#08979c' }} /></Card></Col>
      </Row>
      <Card title={<Space><ExperimentOutlined />“注册 → 开启试用”留白实验{phaseTag}</Space>}>
        <Row gutter={32} align="middle">
          <Col span={14}>
            {[['实验组 · Push + Email', 18.6, '#13a8a8'], ['留白对照组 · 不触达', 16.3, '#bfbfbf']].map(x => <div key={x[0] as string} style={{ marginBottom: 18 }}><Space style={{ width: '100%', justifyContent: 'space-between' }}><b>{x[0]}</b><b>{x[1]}%</b></Space><Progress percent={x[1] as number} strokeColor={x[2] as string} showInfo={false} /></div>)}
          </Col>
          <Col span={10}><Alert type="success" showIcon icon={<CheckCircleOutlined />} message="达到放量门槛" description="试用启动率提升 2.3pp，D7 留存和退订率未恶化。建议将流量从 50% 扩大至 80%，继续保留 20% 对照组。" /></Col>
        </Row>
      </Card>
      <Card title="分层效果指标">
        <Table pagination={false} dataSource={[
          ['发送健康', '送达、退信、退订、投诉', '96.8% 送达', '运营护栏'], ['消息互动', '打开、点击、Deep Link', '21.4% 打开', '诊断指标'],
          ['产品行为', '试用启动、上课、完课', '18.6% 启动', '领先指标'], ['商业结果', '支付、续费、收入、退款', '12.4% 支付', '核心结果'], ['长期质量', 'D7/D30 活跃、留存', 'D7 +0.8pp', '质量护栏'],
        ].map((r,i)=>({key:i, layer:r[0], metric:r[1], result:r[2], use:r[3]}))} columns={[
          {title:'指标层',dataIndex:'layer',render:v=><b>{v}</b>},{title:'指标',dataIndex:'metric'},{title:'当前结果',dataIndex:'result'},{title:'用途',dataIndex:'use'}
        ]}/>
      </Card>
    </Space>
  )

  const items = useMemo(() => [
    { key: 'overview', label: '运营总览', icon: <BarChartOutlined />, children: overview },
    { key: 'segments', label: '用户标签与动态人群', icon: <UsergroupAddOutlined />, children: segmentTab },
    { key: 'events', label: '事件中心', icon: <ApiOutlined />, children: eventsTab },
    { key: 'templates', label: '消息模板', icon: <MailOutlined />, children: templatesTab },
    { key: 'journeys', label: '自动化旅程', icon: <BranchesOutlined />, children: journeysTab },
    { key: 'campaigns', label: 'Campaign', icon: <SendOutlined />, children: campaignsTab },
    { key: 'analytics', label: '实验与效果', icon: <ExperimentOutlined />, children: analyticsTab },
  ], [segments, templates, journeys])

  return (
    <div>
      {header}
      <Tabs activeKey={active} onChange={setActive} items={items} className="lifecycle-tabs" />
      <Modal open={!!createType} title={`${createType === 'segment' ? '创建动态人群' : createType === 'template' ? '创建消息模板' : '创建自动化旅程'} · 四期`} onCancel={() => setCreateType(null)} onOk={submit} okText="保存草稿" width={620}>
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="请输入一个清晰、可识别的名称" /></Form.Item>
          {createType === 'segment' && <Form.Item name="rule" label="组合规则" rules={[{ required: true, message: '请输入组合规则' }]}><Input.TextArea rows={4} placeholder="例如：正式用户 AND 注册>24h AND 试用=未开始 AND 营销授权=是" /></Form.Item>}
          {createType === 'template' && <><Form.Item name="channel" label="触达渠道" rules={[{ required: true }]}><Select options={[{value:'Push'},{value:'Email'}]} /></Form.Item><Form.Item name="language" label="语言版本"><Select mode="multiple" options={['中文','英文','越南语','韩语','阿拉伯语'].map(value=>({value}))}/></Form.Item><Form.Item name="variables" label="动态字段"><Select mode="tags" placeholder="选择或输入动态字段" options={['用户姓名','课程名称','学习进度','试用到期时间','付款链接','Deep Link'].map(value=>({value}))}/></Form.Item></>}
          {createType === 'journey' && <><Form.Item name="trigger" label="进入事件" rules={[{ required: true }]}><Select options={eventRows.map(e=>({value:e.event,label:`${e.event} · ${e.name}`}))}/></Form.Item><Form.Item name="conversion" label="转化/退出事件" rules={[{ required: true }]}><Select options={eventRows.map(e=>({value:e.event,label:`${e.event} · ${e.name}`}))}/></Form.Item><Alert type="warning" showIcon message="发布前还需配置发送前状态复核、触达频控、授权校验与留白对照组。"/></>}
        </Form>
      </Modal>
      <Drawer open={journeyOpen} onClose={() => setJourneyOpen(false)} width={720} title={<Space>注册 → 开启试用{phaseTag}</Space>}>
        <div className="journey-canvas">
          {[
            [<ThunderboltOutlined />, '进入旅程', 'registration_completed · 注册超过24小时'],
            [<SafetyCertificateOutlined />, '资格校验', '正式用户 · 未开始试用 · 非付费 · 已授权'],
            [<ClockCircleOutlined />, '等待 24 小时', '按用户所在时区计算'],
            [<BranchesOutlined />, '重新检查状态', 'trial_started? · subscription_status?'],
            [<BellOutlined />, '发送 Push', '开启你的7天学习体验 · Deep Link'],
            [<ClockCircleOutlined />, '等待 24 小时', '未转化用户继续'],
            [<MailOutlined />, '发送 Email', '为你推荐第一节课'],
            [<CheckCircleOutlined />, '转化并退出', '发生 trial_started 后立即停止后续消息'],
          ].map((n,i)=><div className="journey-node" key={i}><div className="node-icon">{n[0]}</div><div><b>{n[1]}</b><div className="subtle">{n[2]}</div></div>{i<7&&<div className="node-line"/>}</div>)}
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="此画布为四期交互原型；正式版本支持拖拽节点、分支和版本发布" />
      </Drawer>
    </div>
  )
}
