import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Radio, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd'
import { BellOutlined, MailOutlined, PlusOutlined, TagsOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { usePerm } from '../perm'

const { Text, Paragraph } = Typography
type Rule = { field: string; operator: string; value: string }
type UserTag = { id: string; name: string; logic: '满足全部条件' | '满足任一条件'; rules: Rule[]; users: number }
type Template = { id: string; name: string; channel: string; content: string; tags: string[]; enabled: boolean }

const variables = ['用户姓名', '用户ID', '国家', '优惠码', '课程名称', '试用到期时间']
const seedTags: UserTag[] = [
  { id: 'tag_new', name: '韩国新注册用户', logic: '满足全部条件', rules: [{ field: '国家', operator: '等于', value: '韩国' }, { field: '注册时间', operator: '近', value: '7天' }], users: 328 },
  { id: 'tag_trial', name: '体验未完课用户', logic: '满足全部条件', rules: [{ field: '用户状态', operator: '等于', value: '未付费-体验中' }], users: 146 },
]
const seedTemplates: Template[] = [{ id: 'tpl_1', name: '体验课提醒', channel: 'Push', content: 'Hi {{用户姓名}}，你的体验课已为你准备好，点击即可开始学习。', tags: ['体验未完课用户'], enabled: true }]

export default function LifecycleAutomation() {
  const { can } = usePerm()
  const editable = can('lifecycle') === 'operate'
  const [templates, setTemplates] = useState(seedTemplates)
  const [tags, setTags] = useState(seedTags)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [content, setContent] = useState('')
  const [templateForm] = Form.useForm()
  const [tagForm] = Form.useForm()
  const addVariable = (variable: string) => setContent((value) => `${value}${value ? ' ' : ''}{{${variable}}}`)
  const saveTemplate = async () => {
    const value = await templateForm.validateFields()
    setTemplates((items) => [{ id: `tpl_${Date.now()}`, name: value.name, channel: value.channel, content, tags: value.tags || [], enabled: value.enabled ?? true }, ...items])
    setTemplateOpen(false); setContent(''); templateForm.resetFields(); message.success('消息模板已保存')
  }
  const saveTag = async () => {
    const value = await tagForm.validateFields()
    setTags((items) => [{ id: `tag_${Date.now()}`, name: value.name, logic: value.logic, rules: value.rules, users: 0 }, ...items])
    setTagOpen(false); tagForm.resetFields(); message.success('用户标签已保存')
  }
  return <div>
    <Alert showIcon icon={<ThunderboltOutlined />} type="info" message={<><b>四期功能 · 消息中心</b>　配置消息内容，通过组合用户标签确定触达对象。</>} style={{ marginBottom: 16 }} />
    <div className="lifecycle-hero"><div><Text className="eyebrow">MESSAGE CENTER</Text><Typography.Title level={2} style={{ margin: '6px 0' }}>消息中心 <Tag color="cyan">四期</Tag></Typography.Title><Paragraph type="secondary">用预定义变量快速配置多渠道消息，并通过用户属性组合定义目标人群。</Paragraph></div></div>
    <Tabs className="lifecycle-tabs" items={[
      { key: 'templates', label: <><MailOutlined /> 消息模板</>, children: <Card title="消息模板" extra={editable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setTemplateOpen(true)}>新建模板</Button>}><Table rowKey="id" pagination={false} dataSource={templates} columns={[{ title: '模板名称', dataIndex: 'name', render: (v) => <b>{v}</b> }, { title: '发送通道', dataIndex: 'channel', render: (v) => <Tag icon={v === 'Email' ? <MailOutlined /> : <BellOutlined />}>{v}</Tag> }, { title: '消息内容', dataIndex: 'content', ellipsis: true }, { title: '用户标签', dataIndex: 'tags', render: (v: string[]) => <Space wrap>{v.map((x) => <Tag color="cyan" key={x}>{x}</Tag>)}</Space> }, { title: '状态', dataIndex: 'enabled', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? '已启用' : '未启用'}</Tag> }]} /></Card> },
      { key: 'tags', label: <><TagsOutlined /> 用户标签</>, children: <Card title="组合用户标签" extra={editable && <Button type="primary" icon={<PlusOutlined />} onClick={() => setTagOpen(true)}>新建标签</Button>}><Alert type="info" showIcon message="标签由用户属性组合而成；用户属性变化后会自动进入或离开标签。" style={{ marginBottom: 16 }} /><Table rowKey="id" pagination={false} dataSource={tags} columns={[{ title: '标签名称', dataIndex: 'name', render: (v) => <b>{v}</b> }, { title: '组合逻辑', dataIndex: 'logic', render: (v) => <Tag color="blue">{v}</Tag> }, { title: '条件', dataIndex: 'rules', render: (rules: Rule[]) => <Space wrap>{rules.map((r, i) => <Tag key={i}>{`${r.field} ${r.operator} ${r.value}`}</Tag>)}</Space> }, { title: '预计用户数', dataIndex: 'users' }]} /></Card> },
    ]} />
    <Modal open={templateOpen} title="新建消息模板 · 四期" onCancel={() => setTemplateOpen(false)} onOk={saveTemplate} okText="保存" destroyOnClose width={680}><Form form={templateForm} layout="vertical" initialValues={{ channel: 'Push', enabled: true }}><Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input /></Form.Item><Form.Item name="channel" label="发送通道" rules={[{ required: true }]}><Select options={['Push', 'Email', '短信'].map((value) => ({ value }))} /></Form.Item><Form.Item label="消息内容" required><Input.TextArea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={1000} placeholder="填写消息内容" /><Text type="secondary">点击加入预定义变量：</Text><div style={{ marginTop: 8 }}><Space wrap>{variables.map((v) => <Button size="small" key={v} onClick={() => addVariable(v)}>{`{{${v}}}`}</Button>)}</Space></div></Form.Item><Form.Item name="tags" label="选择用户标签"><Select mode="multiple" options={tags.map((tag) => ({ value: tag.name }))} /></Form.Item><Form.Item name="enabled" label="是否启用" valuePropName="checked"><Switch /></Form.Item></Form></Modal>
    <Modal open={tagOpen} title="组合用户标签 · 四期" onCancel={() => setTagOpen(false)} onOk={saveTag} okText="保存" destroyOnClose width={720}><Form form={tagForm} layout="vertical" initialValues={{ logic: '满足全部条件', rules: [{ field: '用户状态', operator: '等于', value: '' }] }}><Form.Item name="name" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}><Input placeholder="例如：韩国新注册用户" /></Form.Item><Form.Item name="logic" label="条件组合"><Radio.Group options={['满足全部条件', '满足任一条件'].map((value) => ({ label: value, value }))} optionType="button" /></Form.Item><Form.List name="rules">{(fields, { add, remove }) => <>{fields.map((field) => <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}><Form.Item name={[field.name, 'field']} rules={[{ required: true }]}><Select style={{ width: 150 }} options={['用户类型', '用户状态', '国家', '注册时间', '支付状态', '营销授权'].map((value) => ({ value }))} /></Form.Item><Form.Item name={[field.name, 'operator']} rules={[{ required: true }]}><Select style={{ width: 110 }} options={['等于', '不等于', '近'].map((value) => ({ value }))} /></Form.Item><Form.Item name={[field.name, 'value']} rules={[{ required: true }]}><Input style={{ width: 220 }} placeholder="填写条件值" /></Form.Item>{fields.length > 1 && <Button type="link" danger onClick={() => remove(field.name)}>删除</Button>}</Space>)}<Button type="dashed" onClick={() => add({ field: '用户状态', operator: '等于', value: '' })}>+ 添加条件</Button></>}</Form.List></Form></Modal>
  </div>
}
