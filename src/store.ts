import { useSyncExternalStore } from 'react'
import dayjs from 'dayjs'
import type {
  ChannelType,
  Coupon,
  CoursePackage,
  Order,
  Student,
} from './types'
import { LINE_CURRENCY } from './types'

const KEY = 'dinoai_crm_state_v4'

export type AppState = {
  channels: ChannelType[]
  students: Student[]
  orders: Order[]
  packages: CoursePackage[]
  coupons: Coupon[]
}

const listeners = new Set<() => void>()
let state: AppState = load()

function emit() {
  save(state)
  listeners.forEach((l) => l())
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const seeded = seed()
  localStorage.setItem(KEY, JSON.stringify(seeded))
  return seeded
}

function save(s: AppState) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function resetState() {
  state = seed()
  emit()
}

export function setState(updater: (prev: AppState) => AppState) {
  state = updater(state)
  emit()
}

export function getState() {
  return state
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => selector(state),
  )
}

// ---------- id helpers ----------
let counter = Date.now()
export function uid(prefix = '') {
  counter += 1
  return `${prefix}${counter.toString(36)}`
}

export function genCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function genChannelCode(prefix: string) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}_${s}`.toLowerCase()
}

// ---------- seed ----------
function seed(): AppState {
  const channels: ChannelType[] = [
    {
      id: 'ct_natural',
      name: '自然流量',
      children: [
        {
          id: 'c_kr',
          name: '韩国',
          level: 1,
          children: [
            {
              id: 'c_kr_aso',
              name: 'ASO',
              level: 2,
              children: [
                { id: 'c_kr_aso_appstore', name: 'App Store 搜索', level: 3, code: 'natural_kr_aso_4f9k2a', children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'ct_landing',
      name: 'landingpage',
      children: [
        {
          id: 'c_lp_sa',
          name: '沙特',
          level: 1,
          children: [
            {
              id: 'c_lp_sa_meta',
              name: 'Meta 信息流',
              level: 2,
              children: [
                { id: 'c_lp_sa_meta_fb', name: 'Facebook 主页', level: 3, code: 'landingpage_sa_meta_a93kd1', children: [] },
                { id: 'c_lp_sa_meta_ig', name: 'Instagram', level: 3, children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'ct_kol',
      name: 'KOL',
      children: [
        {
          id: 'c_kol_vn',
          name: '越南',
          level: 1,
          children: [
            {
              id: 'c_kol_vn_tiktok',
              name: 'TikTok 达人',
              level: 2,
              children: [
                { id: 'c_kol_vn_tiktok_1', name: '@minh_edu', level: 3, code: 'kol_vn_tiktok_88xz0q', children: [] },
              ],
            },
          ],
        },
      ],
    },
  ]

  const now = dayjs()
  const students: Student[] = [
    {
      studentId: '50001', name: 'Ji-woo Kim', enName: 'Lucas', localName: '김지우', gender: '男',
      birthday: '2016-05-12', phone: '+82 10-2345-6789', businessLine: '韩国', registerChannel: '自然流量 / ASO',
      countryCode: '+82', channelCode: 'natural_kr_aso_4f9k2a', registerTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费',
    },
    {
      studentId: '50002', name: 'Abdullah Al-Saud', enName: 'Adam', localName: 'عبدالله', gender: '男',
      birthday: '2015-09-03', phone: '+966 50-123-4567', businessLine: '沙特', registerChannel: 'landingpage / Meta',
      countryCode: '+966', channelCode: 'landingpage_sa_meta_a93kd1', registerTime: now.subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '体验',
    },
    {
      studentId: '50003', name: 'Nguyen Thi Mai', localName: 'Nguyễn Thị Mai', gender: '女',
      birthday: '2017-01-20', phone: '+84 90-123-4567', businessLine: '越南', registerChannel: 'KOL / TikTok',
      countryCode: '+84', channelCode: 'kol_vn_tiktok_88xz0q', registerTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '注册',
    },
    {
      studentId: '50004', name: 'Tan Wei Ming', enName: 'Ethan', localName: '陈伟明', gender: '男',
      birthday: '2016-11-08', phone: '+60 12-345-6789', businessLine: '马来', registerChannel: '自然流量',
      countryCode: '+60', channelCode: 'natural_my_aso_2k1d9x', registerTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '流失',
    },
  ]

  const orders: Order[] = [
    {
      orderId: 'DN2026061800001', productName: 'Dino English 季度会员', studentId: '50001', userStatus: '付费',
      orderStatus: '已支付', originalPrice: 119000, paidAmount: 99000, payMethod: 'App Store', currency: 'KRW',
      paidTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      orderId: 'DN2026061800002', productName: 'Dino English 月度会员', studentId: '50002', userStatus: '体验',
      orderStatus: '待支付', originalPrice: 39, paidAmount: 0, payMethod: 'Google Play', currency: 'USD',
    },
    {
      orderId: 'DN2026061700015', productName: 'Dino English 年度会员', studentId: '50004', userStatus: '流失',
      orderStatus: '已退款', originalPrice: 388, paidAmount: 388, payMethod: 'Stripe', currency: 'MYR',
      paidTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const packages: CoursePackage[] = [
    {
      id: 'PKG1001', businessLine: '韩国', name: 'Dino English 启蒙季度课包', currency: LINE_CURRENCY['韩国'].code,
      price: 99000, validStart: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(80, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '上架', createdAt: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'PKG1002', businessLine: '沙特', name: 'Dino English 月度体验课包', currency: LINE_CURRENCY['沙特'].code,
      price: 149, validStart: now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(23, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '上架', createdAt: now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'PKG1003', businessLine: '越南', name: 'Dino English 年度畅学课包', currency: LINE_CURRENCY['越南'].code,
      price: 2990000, validStart: now.subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(350, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '下架', createdAt: now.subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const coupons: Coupon[] = [
    {
      id: 'CP4017', name: '26年6月韩国新客满减券', code: genCouponCode(), businessLine: '韩国', couponType: '满减券',
      currency: 'KRW', creator: 'admin@dinoai.ai', total: 100000, remaining: 99229,
      claimStart: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), claimEnd: now.add(12, 'day').format('YYYY-MM-DD HH:mm:ss'),
      useStart: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), useEnd: now.add(30, 'day').format('YYYY-MM-DD HH:mm:ss'),
      products: [{ id: 'PKG1001', name: 'Dino English 启蒙季度课包', price: 99000 }],
      thresholdAmount: 99000, deductAmount: 20000, status: '已生效',
      createdAt: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'CP4016', name: '26年6月沙特拉新满减券', code: genCouponCode(), businessLine: '沙特', couponType: '满减券',
      currency: 'USD', creator: 'admin@dinoai.ai', total: 100000, remaining: 97781,
      claimStart: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), claimEnd: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      useStart: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), useEnd: now.add(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
      products: [{ id: 'PKG1002', name: 'Dino English 月度体验课包', price: 149 }],
      thresholdAmount: 149, deductAmount: 30, status: '已结束',
      createdAt: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return { channels, students, orders, packages, coupons }
}
