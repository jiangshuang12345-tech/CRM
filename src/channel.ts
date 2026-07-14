import type { ChannelLevelNode, ChannelLine } from './types'

// 依据渠道 code，返回其在渠道树中的完整路径（渠道类型 / 一级 / 二级…），
// 即该 code 归因到的「最低级别渠道」。找不到返回 null。
export function channelPathByCode(channels: ChannelLine[], code?: string): string | null {
  if (!code) return null
  for (const line of channels) {
    for (const tp of line.children) {
      const walk = (nodes: ChannelLevelNode[], names: string[]): string | null => {
        for (const n of nodes) {
          if (n.code === code) return [tp.name, ...names, n.name].join(' / ')
          const deeper = walk(n.children, [...names, n.name])
          if (deeper) return deeper
        }
        return null
      }
      const found = walk(tp.children, [])
      if (found) return found
    }
  }
  return null
}

// 注册渠道展示：优先按 code 解析到最低级别渠道，否则回退到存储的 registerChannel
export function registerChannelText(
  channels: ChannelLine[],
  s: { businessLine: string; registerChannel: string; channelCode?: string },
): string {
  const path = channelPathByCode(channels, s.channelCode) ?? s.registerChannel
  return `${s.businessLine} · ${path}`
}
