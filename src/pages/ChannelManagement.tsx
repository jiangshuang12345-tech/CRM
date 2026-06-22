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
import { useI18n } from '../i18n'

const { Text } = Typography
const LEVEL_COLOR = ['', 'blue', 'cyan', 'green']

type AddCtx =
  | { kind: 'type' }
  | { kind: 'child'; typeId: string; parentId?: string; nextLevel: 1 | 2 | 3 }

export default function ChannelManagement() {
  const { t } = useI18n()
  const channels = useStore((s) => s.channels)
  const [addCtx, setAddCtx] = useState<AddCtx | null>(null)
  const [renameNode, setRenameNode] = useState<{ id: string; name: string } | null>(null)
  const [form] = Form.useForm()

  const levelLabel = (level: 1 | 2 | 3) => t(`ch.level${level}`)

  const updateType = (typeId: string, fn: (t: ChannelType) => ChannelType) =>
    setState((prev) => ({
      ...prev,
      channels: prev.channels.map((tp) => (tp.id === typeId ? fn(tp) : tp)),
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
      message.success(t('ch.typeCreated'))
    } else {
      const node: ChannelLevelNode = {
        id: uid('c_'),
        name,
        level: addCtx.nextLevel,
        children: [],
      }
      updateType(addCtx.typeId, (tp) => {
        if (!addCtx.parentId) return { ...tp, children: [...tp.children, node] }
        return { ...tp, children: walk(tp.children, addCtx.parentId, (p) => ({ ...p, children: [...p.children, node] })) }
      })
      message.success(t('ch.levelCreated', { level: levelLabel(addCtx.nextLevel) }))
    }
    setAddCtx(null)
  }

  const generateCode = (typeId: string, node: ChannelLevelNode) => {
    const type = channels.find((tp) => tp.id === typeId)
    const prefix = `${type?.name ?? 'ch'}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'ch'
    const code = node.code ?? genChannelCode(prefix)
    updateType(typeId, (tp) => ({ ...tp, children: walk(tp.children, node.id, (n) => ({ ...n, code })) }))
    Modal.success({
      title: node.code ? t('ch.codeTitleView') : t('ch.codeTitleGen'),
      content: (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{t('ch.codeDesc')}</Text>
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
                message.success(t('common.copied'))
              }}
            >
              {t('common.copy')}
            </Button>
          </div>
        </div>
      ),
    })
  }

  const submitRename = async () => {
    const { name } = await form.validateFields()
    if (!renameNode) return
    const isType = channels.some((tp) => tp.id === renameNode.id)
    if (isType) {
      setState((prev) => ({
        ...prev,
        channels: prev.channels.map((tp) => (tp.id === renameNode.id ? { ...tp, name } : tp)),
      }))
    } else {
      const typeId = channels.find((tp) => containsNode(tp.children, renameNode.id))?.id
      if (typeId) updateType(typeId, (tp) => ({ ...tp, children: walk(tp.children, renameNode.id, (n) => ({ ...n, name })) }))
    }
    message.success(t('ch.renamed'))
    setRenameNode(null)
  }

  const containsNode = (nodes: ChannelLevelNode[], id: string): boolean =>
    nodes.some((n) => n.id === id || containsNode(n.children, id))

  const deleteType = (typeId: string) =>
    Modal.confirm({
      title: t('ch.delTypeTitle'),
      content: t('ch.delTypeContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => setState((prev) => ({ ...prev, channels: prev.channels.filter((tp) => tp.id !== typeId) })),
    })

  const deleteLevel = (typeId: string, nodeId: string) =>
    Modal.confirm({
      title: t('ch.delLevelTitle'),
      content: t('ch.delLevelContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => updateType(typeId, (tp) => ({ ...tp, children: removeNode(tp.children, nodeId) })),
    })

  const renderLevelTitle = (typeId: string, n: ChannelLevelNode) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Tag color={LEVEL_COLOR[n.level]} style={{ margin: 0 }}>
        {levelLabel(n.level)}
      </Tag>
      <span>{n.name}</span>
      {n.code && (
        <Tag color="gold" style={{ margin: 0, fontFamily: 'monospace' }}>
          code: {n.code}
        </Tag>
      )}
      <Space size={2} className="node-actions">
        {n.level < 3 && (
          <Tooltip title={t('ch.addChild', { level: levelLabel((n.level + 1) as 1 | 2 | 3) })}>
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
        <Tooltip title={n.code ? t('ch.codeView') : t('ch.codeGen')}>
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined />}
            style={{ color: n.code ? '#faad14' : '#2F6BFF' }}
            onClick={() => generateCode(typeId, n)}
          />
        </Tooltip>
        <Tooltip title={t('ch.rename')}>
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
        <Tooltip title={t('common.delete')}>
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

  const treeData: DataNode[] = channels.map((tp) => ({
    key: tp.id,
    title: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Tag color="purple" style={{ margin: 0 }}>
          {t('ch.type')}
        </Tag>
        <Text strong>{tp.name}</Text>
        <Space size={2} className="node-actions">
          <Tooltip title={t('ch.addChild', { level: levelLabel(1) })}>
            <Button
              type="text"
              size="small"
              icon={<PlusSquareOutlined />}
              onClick={() => openAdd({ kind: 'child', typeId: tp.id, nextLevel: 1 })}
            />
          </Tooltip>
          <Tooltip title={t('ch.rename')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setRenameNode({ id: tp.id, name: tp.name })
                form.setFieldsValue({ name: tp.name })
              }}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteType(tp.id)} />
          </Tooltip>
        </Space>
      </span>
    ),
    children: tp.children.map((c) => toDataNode(tp.id, c)),
  }))

  return (
    <Card
      className="page-card"
      bordered={false}
      title={<span className="section-title">{t('ch.title')}</span>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd({ kind: 'type' })}>
          {t('ch.addType')}
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
        <Text type="secondary">{t('ch.intro')}</Text>
      </div>
      {channels.length === 0 ? (
        <Empty description={t('ch.empty')} />
      ) : (
        <Tree treeData={treeData} defaultExpandAll blockNode selectable={false} />
      )}

      <Modal
        open={!!addCtx}
        title={addCtx?.kind === 'type' ? t('ch.addType') : t('ch.addChild', { level: addCtx ? levelLabel(addCtx.nextLevel) : '' })}
        onCancel={() => setAddCtx(null)}
        onOk={submitAdd}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {addCtx?.kind === 'type' ? (
            <Form.Item
              name="name"
              label={t('ch.typeNameLabel')}
              rules={[{ required: true, message: t('ch.typeNamePlaceholder') }]}
              extra={t('ch.typeNameExtra')}
            >
              <Input placeholder={t('ch.typeNamePlaceholder')} />
            </Form.Item>
          ) : (
            <Form.Item
              name="name"
              label={t('ch.levelNameLabel', { level: addCtx ? levelLabel(addCtx.nextLevel) : '' })}
              rules={[{ required: true, message: t('ch.nameRequired') }]}
            >
              <Input placeholder={t('ch.levelNamePlaceholder')} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={!!renameNode}
        title={t('ch.rename')}
        onCancel={() => setRenameNode(null)}
        onOk={submitRename}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label={t('ch.nameLabel')} rules={[{ required: true, message: t('ch.nameRequired') }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
