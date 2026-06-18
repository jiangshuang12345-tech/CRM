import { useState } from 'react'
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  PlusSquareOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import { genChannelCode, setState, uid, useStore } from '../store'
import type { ChannelLevelNode, ChannelType } from '../types'

const { Text } = Typography
const LEVEL_LABEL = ['', '一级渠道', '二级渠道', '三级渠道']
const LEVEL_COLOR = ['', 'blue', 'cyan', 'green']

type AddCtx =
  | { kind: 'type' }
  | { kind: 'child'; typeId: string; parentId?: string; nextLevel: 1 | 2 | 3 }

export default function ChannelManagement() {
  const channels = useStore((s) => s.channels)
  const [addCtx, setAddCtx] = useState<AddCtx | null>(null)
  const [renameNode, setRenameNode] = useState<{ id: string; name: string } | null>(null)
  const [form] = Form.useForm()

  // 修改某个 type 树
  const updateType = (typeId: string, fn: (t: ChannelType) => ChannelType) =>
    setState((prev) => ({
      ...prev,
      channels: prev.channels.map((t) => (t.id === typeId ? fn(t) : t)),
    }))

  const walk = (
    nodes: ChannelLevelNode[],
    targetId: string,
    fn: (n: ChannelLevelNode) => ChannelLevelNode,
  ): ChannelLevelNode[] =>
    nodes.map((n) =>
      n.id === targetId ? fn(n) : { ...n, children: walk(n.children, targetId, fn) },
    )

  const removeNode = (nodes: ChannelLevelNode[], targetId: string): ChannelLevelNode[] =>
    nodes
      .filter((n) => n.id !== targetId)
      .map((n) => ({ ...n, children: removeNode(n.children, targetId) }))

  // ---- 新增类型 / 渠道 ----
  const openAdd = (ctx: AddCtx) => {
    setAddCtx(ctx)
    form.resetFields()
  }

  const submitAdd = async () => {
    const { name } = await form.validateFields()
    if (!addCtx) return
    if (addCtx.kind === 'type') {
      setState((prev) => ({
        ...prev,
        channels: [...prev.channels, { id: uid('ct_'), name, children: [] }],
      }))
      message.success('渠道类型已创建')
    } else {
      const node: ChannelLevelNode = {
        id: uid('c_'),
        name,
        level: addCtx.nextLevel,
        children: [],
      }
      updateType(addCtx.typeId, (t) => {
        if (!addCtx.parentId) return { ...t, children: [...t.children, node] }
        return { ...t, children: walk(t.children, addCtx.parentId, (p) => ({ ...p, children: [...p.children, node] })) }
      })
      message.success(`${LEVEL_LABEL[addCtx.nextLevel]}已创建`)
    }
    setAddCtx(null)
  }

  // ---- 生成 / 查看 code ----
  const generateCode = (typeId: string, node: ChannelLevelNode) => {
    const type = channels.find((t) => t.id === typeId)
    const prefix = `${type?.name ?? 'ch'}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'ch'
    const code = node.code ?? genChannelCode(prefix)
    updateType(typeId, (t) => ({ ...t, children: walk(t.children, node.id, (n) => ({ ...n, code })) }))
    Modal.success({
      title: node.code ? '渠道 Code' : '渠道 Code 已生成',
      content: (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">该渠道实际应用的 code：</Text>
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              background: '#f5f7fa',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 15,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{code}</span>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard?.writeText(code)
                message.success('已复制')
              }}
            >
              复制
            </Button>
          </div>
        </div>
      ),
    })
  }

  // ---- 重命名 / 删除 ----
  const submitRename = async () => {
    const { name } = await form.validateFields()
    if (!renameNode) return
    // type 还是 level node?
    const isType = channels.some((t) => t.id === renameNode.id)
    if (isType) {
      setState((prev) => ({
        ...prev,
        channels: prev.channels.map((t) => (t.id === renameNode.id ? { ...t, name } : t)),
      }))
    } else {
      const typeId = channels.find((t) => containsNode(t.children, renameNode.id))?.id
      if (typeId) updateType(typeId, (t) => ({ ...t, children: walk(t.children, renameNode.id, (n) => ({ ...n, name })) }))
    }
    message.success('已重命名')
    setRenameNode(null)
  }

  const containsNode = (nodes: ChannelLevelNode[], id: string): boolean =>
    nodes.some((n) => n.id === id || containsNode(n.children, id))

  const deleteType = (typeId: string) =>
    Modal.confirm({
      title: '删除渠道类型',
      content: '该类型下的所有渠道与 code 将一并删除，确认删除？',
      okButtonProps: { danger: true },
      onOk: () => setState((prev) => ({ ...prev, channels: prev.channels.filter((t) => t.id !== typeId) })),
    })

  const deleteLevel = (typeId: string, nodeId: string) =>
    Modal.confirm({
      title: '删除渠道',
      content: '该渠道及其下级渠道、code 将一并删除，确认删除？',
      okButtonProps: { danger: true },
      onOk: () => updateType(typeId, (t) => ({ ...t, children: removeNode(t.children, nodeId) })),
    })

  // ---- 构建 Tree ----
  const renderLevelTitle = (typeId: string, n: ChannelLevelNode) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Tag color={LEVEL_COLOR[n.level]} style={{ margin: 0 }}>
        {LEVEL_LABEL[n.level]}
      </Tag>
      <span>{n.name}</span>
      {n.code && (
        <Tag color="gold" style={{ margin: 0, fontFamily: 'monospace' }}>
          code: {n.code}
        </Tag>
      )}
      <Space size={2} className="node-actions">
        {n.level < 3 && (
          <Tooltip title={`新增${LEVEL_LABEL[(n.level + 1) as 1 | 2 | 3]}`}>
            <Button
              type="text"
              size="small"
              icon={<PlusSquareOutlined />}
              onClick={() =>
                openAdd({ kind: 'child', typeId, parentId: n.id, nextLevel: (n.level + 1) as 1 | 2 | 3 })
              }
            />
          </Tooltip>
        )}
        <Tooltip title={n.code ? '查看 code' : '生成 code'}>
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined />}
            style={{ color: n.code ? '#faad14' : '#2F6BFF' }}
            onClick={() => generateCode(typeId, n)}
          />
        </Tooltip>
        <Tooltip title="重命名">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setRenameNode({ id: n.id, name: n.name })
              form.setFieldsValue({ name: n.name })
            }}
          />
        </Tooltip>
        <Tooltip title="删除">
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteLevel(typeId, n.id)} />
        </Tooltip>
      </Space>
    </span>
  )

  const toDataNode = (typeId: string, n: ChannelLevelNode): DataNode => ({
    key: n.id,
    title: renderLevelTitle(typeId, n),
    children: n.children.map((c) => toDataNode(typeId, c)),
  })

  const treeData: DataNode[] = channels.map((t) => ({
    key: t.id,
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Tag color="purple" style={{ margin: 0 }}>
          渠道类型
        </Tag>
        <Text strong>{t.name}</Text>
        <Space size={2} className="node-actions">
          <Tooltip title="新增一级渠道">
            <Button
              type="text"
              size="small"
              icon={<PlusSquareOutlined />}
              onClick={() => openAdd({ kind: 'child', typeId: t.id, nextLevel: 1 })}
            />
          </Tooltip>
          <Tooltip title="重命名">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setRenameNode({ id: t.id, name: t.name })
                form.setFieldsValue({ name: t.name })
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteType(t.id)} />
          </Tooltip>
        </Space>
      </span>
    ),
    children: t.children.map((c) => toDataNode(t.id, c)),
  }))

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">渠道层级管理</span>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd({ kind: 'type' })}>
          新增渠道类型
        </Button>
      }
    >
      <style>{`
        .node-actions { opacity: 0; transition: opacity .15s; }
        .ant-tree-treenode:hover .node-actions { opacity: 1; }
        .ant-tree-node-content-wrapper { width: 100%; }
        .ant-tree .ant-tree-treenode { padding: 4px 0; align-items: center; }
      `}</style>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">
          渠道结构：渠道类型（自然流量 / landingpage / KOL…） → 一级渠道 → 二级渠道 → 三级渠道（一期支持至三级，可扩展）。在任意级渠道上可生成实际应用的渠道 code。
        </Text>
      </div>
      {channels.length === 0 ? (
        <Empty description="暂无渠道，请先新增渠道类型" />
      ) : (
        <Tree treeData={treeData} defaultExpandAll blockNode selectable={false} />
      )}

      <Modal
        open={!!addCtx}
        title={addCtx?.kind === 'type' ? '新增渠道类型' : `新增${addCtx ? LEVEL_LABEL[addCtx.nextLevel] : ''}`}
        onCancel={() => setAddCtx(null)}
        onOk={submitAdd}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {addCtx?.kind === 'type' ? (
            <Form.Item
              name="name"
              label="渠道类型名称"
              rules={[{ required: true, message: '请输入渠道类型名称' }]}
              extra="例如：自然流量、landingpage、KOL"
            >
              <Input placeholder="请输入渠道类型名称" />
            </Form.Item>
          ) : (
            <Form.Item
              name="name"
              label={`${addCtx ? LEVEL_LABEL[addCtx.nextLevel] : ''}名称`}
              rules={[{ required: true, message: '请输入渠道名称' }]}
            >
              <Input placeholder="请输入渠道名称（如国家、媒体、达人等）" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={!!renameNode}
        title="重命名"
        onCancel={() => setRenameNode(null)}
        onOk={submitRename}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
