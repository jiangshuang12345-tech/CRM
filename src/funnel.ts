import type { Student } from './types'

// 是否能获取到用户手机号
export function hasContactPhone(s: Student): boolean {
  return !!(s.phone && s.phone.trim())
}

// 已注册-未体验：用户状态为「注册」
export function isRegisteredNotTried(s: Student): boolean {
  return s.status === '注册'
}

// 销售跟进线索：已注册未体验，且能拿到手机号 → 交给销售跟进
export function isSalesLead(s: Student): boolean {
  return isRegisteredNotTried(s) && hasContactPhone(s)
}

// 进入用户中心的用户：
// - 已注册未体验但拿不到手机号 → 直接进用户中心
// - 已体验 / 已付费及后续状态 → 全部进用户中心
export function inUserCenter(s: Student): boolean {
  return !isSalesLead(s)
}
