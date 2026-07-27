import { useEffect, useState } from 'react'
import { usePerm } from './perm'

// 业务线「默认勾选」：
// 依据账号的数据权限，默认勾选其业务线；但并非真正的数据隔离，
// 用户可自行改选，查看其他业务线的数据。selected 为空表示不过滤（全部）。
export function useLineScope() {
  const { account, allowedLines } = usePerm()
  const scope = allowedLines()
  const isRestricted = scope !== null
  const defaultLines = scope ?? []
  
  const [selected, setSelected] = useState<string[]>(defaultLines)

  // 切换身份/账号时，重置为该账号数据权限内的业务线
  useEffect(() => {
    setSelected(scope ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id])

  const currentSelected = isRestricted ? scope! : selected

  const matchLine = (line: string) => {
    if (isRestricted) return scope!.includes(line)
    return selected.length === 0 || selected.includes(line)
  }

  return { 
    selected: currentSelected, 
    setSelected, 
    defaultLines, 
    matchLine,
    disabled: isRestricted
  }
}
