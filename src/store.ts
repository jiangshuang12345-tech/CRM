import { useSyncExternalStore } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
import type {
  Account,
  AuditLog,
  CallRecord,
  ChannelLevelNode,
  ChannelLine,
  Coupon,
  CoursePackage,
  LandingPage,
  LessonRecord,
  ModuleKey,
  Order,
  Role,
  Student,
} from './types'
import { LINE_CURRENCY } from './types'

const KEY = 'dinoai_crm_state_v37'

export type AppState = {
  channels: ChannelLine[]
  students: Student[]
  orders: Order[]
  packages: CoursePackage[]
  coupons: Coupon[]
  landingPages: LandingPage[]
  roles: Role[]
  accounts: Account[]
  logs: AuditLog[]
  callRecords: CallRecord[]
  lessons: LessonRecord[]
}

const listeners = new Set<() => void>()
// 注意：counter 必须在 load()/seed() 之前初始化，否则 seed 内调用 uid() 会触发 TDZ 报错
let counter = Date.now()
let state: AppState = load()

function emit() {
  save(state)
  listeners.forEach((l) => l())
}

function load(): AppState {
  const seeded = seed()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      // 合并种子默认值：即使旧数据缺少新增字段（如 callRecords），也不会因 undefined 而崩溃
      return { ...seeded, ...(JSON.parse(raw) as Partial<AppState>) }
    }
  } catch {
    /* ignore */
  }
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
export function uid(prefix = '') {
  counter += 1
  return `${prefix}${counter.toString(36)}`
}

function randomStr(chars: string, len: number) {
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// 生成一个不在 used 集合中的随机码；极端情况下追加计数器兜底，保证绝对唯一
function uniqueCode(make: () => string, used: Set<string>) {
  let code = make()
  let guard = 0
  while (used.has(code) && guard < 1000) {
    code = make()
    guard += 1
  }
  if (used.has(code)) {
    counter += 1
    code = `${code}${counter.toString(36)}`
  }
  return code
}

// 收集当前渠道树中所有已存在的渠道 code（含各级）
function collectChannelCodes(lines: ChannelLine[]): Set<string> {
  const used = new Set<string>()
  const walk = (nodes: ChannelLevelNode[]) => {
    for (const n of nodes) {
      if (n.code) used.add(n.code)
      if (n.children) walk(n.children)
    }
  }
  for (const line of lines) {
    for (const type of line.children) walk(type.children)
  }
  return used
}

// 收集当前所有优惠券里已存在的兑换码
function collectCouponCodes(coupons: Coupon[]): Set<string> {
  const used = new Set<string>()
  for (const c of coupons) {
    for (const cc of c.codes) if (cc.code) used.add(cc.code)
  }
  return used
}

// 安全读取 state：seed() 在 state 赋值前执行，直接访问会触发 TDZ，这里兜底为 undefined
function safeState(): AppState | undefined {
  try {
    return state
  } catch {
    return undefined
  }
}

// 生成优惠券兑换码，自动对已存在的码（含正在编辑但未保存的 extraUsed）去重
export function genCouponCode(extraUsed: string[] = []) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const used = collectCouponCodes(safeState()?.coupons ?? [])
  for (const c of extraUsed) if (c) used.add(c)
  return uniqueCode(() => randomStr(chars, 12), used)
}

// 生成渠道 code，自动对渠道树中已存在的 code 去重
export function genChannelCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const used = collectChannelCodes(safeState()?.channels ?? [])
  return uniqueCode(() => randomStr(chars, 7), used)
}

// 生成商品包 ID（PKG####），自动对已存在的商品包 ID 去重
export function genPackageId() {
  const used = new Set((safeState()?.packages ?? []).map((p) => p.id))
  return uniqueCode(() => `PKG${Math.floor(1000 + Math.random() * 9000)}`, used)
}

// 生成优惠券 ID（CP####），自动对已存在的优惠券 ID 去重
export function genCouponId() {
  const used = new Set((safeState()?.coupons ?? []).map((c) => c.id))
  return uniqueCode(() => `CP${Math.floor(1000 + Math.random() * 9000)}`, used)
}

// 生成通话记录 ID（递增，天然唯一）
export function genCallId() {
  return uid('call_')
}

// ---------- seed ----------
function seed(): AppState {
  const channels: ChannelLine[] = [
    {
      id: 'bl_kr',
      name: '韩国',
      children: [
        {
          id: 'ct_kr_natural',
          name: '自然流量',
          children: [
            {
              id: 'c_kr_aso',
              name: 'ASO',
              level: 1,
              children: [
                { id: 'c_kr_aso_appstore', name: 'App Store 搜索', level: 2, code: 'K2000Gh', children: [] },
              ],
            },
          ],
        },
        {
          id: 'ct_kr_kol',
          name: 'KOL',
          children: [
            {
              id: 'c_kr_kol_ig',
              name: 'Instagram 达人',
              level: 1,
              children: [
                { id: 'c_kr_kol_ig_1', name: '@seoyeon_edu', level: 2, code: 'Ig58Kpq', children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bl_sa',
      name: '沙特',
      children: [
        {
          id: 'ct_sa_landing',
          name: 'landingpage',
          children: [
            {
              id: 'c_sa_meta',
              name: 'Meta 信息流',
              level: 1,
              children: [
                { id: 'c_sa_meta_fb', name: 'Facebook 主页', level: 2, code: 'Fb73Mxa', children: [] },
                { id: 'c_sa_meta_ig', name: 'Instagram', level: 2, children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bl_th',
      name: '泰国',
      children: [
        {
          id: 'ct_th_natural',
          name: '自然流量',
          children: [
            { id: 'c_th_aso', name: 'ASO', level: 1, children: [] },
          ],
        },
      ],
    },
    {
      id: 'bl_vn',
      name: '越南',
      children: [
        {
          id: 'ct_vn_kol',
          name: 'KOL',
          children: [
            {
              id: 'c_vn_tiktok',
              name: 'TikTok 达人',
              level: 1,
              children: [
                { id: 'c_vn_tiktok_1', name: '@minh_edu', level: 2, code: 'Tk88Vzq', children: [] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bl_id',
      name: '印尼',
      children: [
        {
          id: 'ct_id_landing',
          name: 'landingpage',
          children: [
            { id: 'c_id_meta', name: 'Meta 信息流', level: 1, children: [] },
          ],
        },
      ],
    },
  ]

  const now = dayjs.utc() // 种子时间统一以 UTC 存储，展示时再按用户注册国家换算
  const students: Student[] = [
    {
      studentId: '2060199610824355842', name: 'Ji-woo Kim', localName: '김지우', userType: '正式用户', gender: '男',
      birthday: '2016-05-12', ageGroup: '9-12', loginMethod: '谷歌邮箱', account: 'jiwoo.kim@gmail.com', businessLine: '韩国', registerChannel: '自然流量 / ASO',
      countryCode: '+82', channelCode: 'K2000Gh', country: '韩国', appChannel: 'App Store', registerTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费', expireTime: now.add(88, 'day').format('YYYY-MM-DD HH:mm:ss'), lastModifier: 'admin@dinoai.ai',
      editHistory: [
        {
          time: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
          action: 'user.hist.edit',
          changes: [{ field: '年龄段', before: '6-8', after: '9-12' }],
          modifier: 'admin@dinoai.ai',
        },
        {
          time: now.subtract(2, 'day').add(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
          action: 'user.hist.edit',
          changes: [
            { field: '学生姓名', before: '지우', after: '김지우' },
            { field: '年龄段', before: '3-5', after: '6-8' },
          ],
          modifier: 'ops.kr@dinoai.ai',
        },
      ],
    },
    {
      studentId: '2060199610824355843', name: 'Abdullah Al-Saud', localName: 'عبدالله', userType: '正式用户', gender: '男',
      birthday: '2015-09-03', ageGroup: '9-12', loginMethod: 'Facebook', account: 'abdullah.alsaud@outlook.com', businessLine: '沙特', registerChannel: 'landingpage / Meta',
      countryCode: '+966', channelCode: 'Fb73Mxa', country: '沙特', appChannel: 'Google Play', registerTime: now.subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费', expireTime: now.add(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      studentId: '2060199610824355844', name: 'Nguyen Thi Mai', localName: 'Nguyễn Thị Mai', userType: '测试用户', gender: '女',
      birthday: '2017-01-20', ageGroup: '6-8', loginMethod: '手机号', account: '+84 00000-1234', phone: '+84 00000-1234', businessLine: '越南', registerChannel: 'KOL / TikTok', channelSource: 'VN_META_JULY',
      countryCode: '+84', channelCode: 'Tk88Vzq', country: '越南', appChannel: 'Google Play', registerTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '未付费-未体验', salesProgress: '待领取',
    },
    {
      studentId: '2060199610824355845', name: 'Tan Wei Ming', localName: '陈伟明', userType: '测试用户', gender: '男',
      birthday: '2016-11-08', ageGroup: '13-17', loginMethod: 'AppID', account: 'weiming.tan@icloud.com', businessLine: '马来', registerChannel: '自然流量',
      countryCode: '+60', channelCode: 'As2K1d9', country: '马来西亚', appChannel: 'App Store', registerTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费逾期', expireTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      studentId: '2060199610824355846', name: 'Seo-yeon Park', localName: '박서연', userType: '正式用户', gender: '女',
      birthday: '2017-03-22', ageGroup: '6-8', loginMethod: 'kakao', account: '+82 10-9876-5432', phone: '+82 10-9876-5432', businessLine: '韩国', registerChannel: 'KOL / Instagram',
      countryCode: '+82', channelCode: 'Ig58Kpq', country: '韩国', appChannel: 'Google Play', registerTime: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '付费逾期', expireTime: now.subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      // 已注册未体验 + 有手机号（正式）→ 进入「销售中心-待领取」
      studentId: '2060199610824355847', name: 'Putri Ayu', localName: 'Putri', userType: '正式用户', gender: '女',
      birthday: '2015-07-15', ageGroup: '9-12', loginMethod: '手机号', account: '+62 812-3456-7890', phone: '+62 812-3456-7890', businessLine: '其他', registerChannel: 'KOL / TikTok', channelSource: 'ID_TIKTOK_JULY',
      countryCode: '+62', channelCode: 'Id77Xyz', country: '印尼', appChannel: 'Google Play', registerTime: now.subtract(6, 'hour').format('YYYY-MM-DD HH:mm:ss'), status: '未付费-未体验', salesProgress: '待领取',
    },
    {
      // 未付费 + 已体验（有完课体验课）+ 无手机号（第三方登录）→ 直接进入用户中心
      studentId: '2060199610824355848', name: 'Somchai Prom', localName: 'สมชาย', userType: '正式用户', gender: '男',
      birthday: '2016-02-10', ageGroup: '9-12', loginMethod: '谷歌邮箱', account: 'somchai.prom@gmail.com', businessLine: '其他', registerChannel: '自然流量 / ASO', channelSource: 'TH_ASO',
      countryCode: '+66', channelCode: 'Th55Abc', country: '泰国', appChannel: 'App Store', registerTime: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'), status: '未付费-未体验',
    },
    {
      // 未付费 + 体验中（有进行中体验课、无完课体验课）+ 无手机号 → 直接进入用户中心
      studentId: '2060199610824355849', name: 'Aisha Rahman', localName: 'Aisha', userType: '正式用户', gender: '女',
      birthday: '2016-06-25', ageGroup: '6-8', loginMethod: '谷歌邮箱', account: 'aisha.rahman@gmail.com', businessLine: '其他', registerChannel: '自然流量 / ASO', channelSource: 'ID_ASO',
      countryCode: '+62', channelCode: 'Id77Xyz', country: '印尼', appChannel: 'Google Play', registerTime: now.subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'), status: '未付费-未体验',
    },
    {
      // 已领取跟进中的线索（供「我的跟进」演示）
      studentId: '2060199610824356003', name: 'Hana', localName: 'Hana', userType: '正式用户', gender: '女',
      birthday: '2016-04-18', ageGroup: '9-12', loginMethod: '手机号', account: '+60 17-451 9920', phone: '+60 17-451 9920', businessLine: '马来', registerChannel: 'Google Search', channelSource: 'MY_GOOGLE_SEARCH',
      countryCode: '+60', channelCode: 'My33Grh', country: '马来西亚', appChannel: 'Google Play', registerTime: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '未付费-未体验',
      salesOwner: 'admin@dinoai.ai', salesProgress: '跟进中', salesLatestNote: '已联系家长，确认体验时间', salesNextFollow: now.add(4, 'hour').format('YYYY-MM-DD HH:mm:ss'), salesUpdatedAt: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      salesHistory: [
        { progress: '跟进中', note: '已联系家长，确认体验时间', time: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'), owner: 'admin@dinoai.ai' },
        { progress: '跟进中', note: '销售已领取，开始跟进已注册用户', time: now.subtract(20, 'hour').format('YYYY-MM-DD HH:mm:ss'), owner: 'admin@dinoai.ai' },
      ],
    },
    {
      studentId: '2060199610824356004', name: 'Ji-won', localName: '지원', userType: '正式用户', gender: '男',
      birthday: '2015-12-01', ageGroup: '9-12', loginMethod: '手机号', account: '+82 10-8821-2390', phone: '+82 10-8821-2390', businessLine: '韩国', registerChannel: 'Meta', channelSource: 'KR_META_SUMMER',
      countryCode: '+82', channelCode: 'Kr21Msm', country: '韩国', appChannel: 'App Store', registerTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), status: '未付费-未体验',
      salesOwner: 'admin@dinoai.ai', salesProgress: '暂不跟进', salesLatestNote: '家长还在了解课程价格', salesNextFollow: now.add(1, 'day').format('YYYY-MM-DD HH:mm:ss'), salesUpdatedAt: now.subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      salesHistory: [
        { progress: '暂不跟进', note: '家长还在了解课程价格', time: now.subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'), owner: 'admin@dinoai.ai' },
      ],
    },
  ]

  const orders: Order[] = [
    {
      orderId: 'DN2026061800001', productName: 'Dino English 季度会员', studentId: '2060199610824355842', userStatus: '付费',
      orderStatus: '已支付', originalPrice: 119000, paidAmount: 99000, payMethod: 'App Store', currency: 'KRW',
      paidTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(88, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      orderId: 'DN2026061800002', productName: 'Dino English 月度会员', studentId: '2060199610824355843', userStatus: '付费',
      orderStatus: '待支付', originalPrice: 39, paidAmount: 0, payMethod: 'Google Play', currency: 'USD',
    },
    {
      orderId: 'DN2026061700015', productName: 'Dino English 年度会员', studentId: '2060199610824355845', userStatus: '付费逾期',
      orderStatus: '已退款', originalPrice: 388, paidAmount: 388, payMethod: 'Stripe', currency: 'MYR',
      paidTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(357, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      orderId: 'DN2026061600008', productName: 'Dino English 年度会员', studentId: '2060199610824355846', userStatus: '付费逾期',
      orderStatus: '已取消', originalPrice: 119000, paidAmount: 0, payMethod: 'App Store', currency: 'KRW',
    },
  ]

  const packages: CoursePackage[] = [
    {
      id: 'PKG1001', businessLine: '韩国', name: 'Dino English 启蒙季度商品包', currency: LINE_CURRENCY['韩国'].code,
      price: 99000, validStart: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(80, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '上架', createdAt: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'PKG1002', businessLine: '沙特', name: 'Dino English 月度体验商品包', currency: LINE_CURRENCY['沙特'].code,
      price: 149, validStart: now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(23, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '上架', createdAt: now.subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'PKG1003', businessLine: '越南', name: 'Dino English 年度畅学商品包', currency: LINE_CURRENCY['越南'].code,
      price: 2990000, validStart: now.subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'), validEnd: now.add(350, 'day').format('YYYY-MM-DD HH:mm:ss'),
      creator: 'admin@dinoai.ai', status: '下架', createdAt: now.subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const coupons: Coupon[] = [
    {
      id: 'CP4017', name: '26年6月韩国新客满减券',
      codes: [
        { id: uid('cc_'), code: genCouponCode(), kol: '@seoyeon_edu', used: 412 },
        { id: uid('cc_'), code: genCouponCode(), kol: '@jiwoo_mom', used: 187 },
        { id: uid('cc_'), code: genCouponCode(), kol: '官方自投', used: 172 },
      ],
      businessLine: '韩国', couponType: '满减券',
      currency: 'KRW', creator: 'admin@dinoai.ai', total: 100000, remaining: 99229,
      claimStart: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), claimEnd: now.add(12, 'day').format('YYYY-MM-DD HH:mm:ss'),
      useStart: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), useEnd: now.add(30, 'day').format('YYYY-MM-DD HH:mm:ss'),
      products: [{ id: 'PKG1001', name: 'Dino English 启蒙季度商品包', price: 99000 }],
      thresholdAmount: 99000, deductAmount: 20000, status: '已生效',
      createdAt: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'CP4016', name: '26年6月沙特拉新满减券',
      codes: [
        { id: uid('cc_'), code: genCouponCode(), kol: '@sara.ksa', used: 1203 },
        { id: uid('cc_'), code: genCouponCode(), kol: '官方自投', used: 1016 },
      ],
      businessLine: '沙特', couponType: '满减券',
      currency: 'USD', creator: 'admin@dinoai.ai', total: 100000, remaining: 97781,
      claimStart: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), claimEnd: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      useStart: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), useEnd: now.add(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
      products: [{ id: 'PKG1002', name: 'Dino English 月度体验商品包', price: 149 }],
      thresholdAmount: 149, deductAmount: 30, status: '已结束',
      createdAt: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const landingPages: LandingPage[] = [
    {
      id: uid('lp_'),
      businessLine: '韩国',
      channelCode: 'K2000Gh',
      channelName: '自然流量 / ASO / App Store 搜索',
      packageId: 'PKG1001',
      packageName: 'Dino English 启蒙季度商品包',
      couponId: 'CP4017',
      couponCode: '',
      validFrom: now.subtract(2, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(28, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      url: 'https://kr.dinoai.ai/website/signin/?backurl=%2Fwebsite%2Fpayment%2Fsku%2F%3Fid%3DPKG1001%26channel%3DK2000Gh',
      creator: 'admin@dinoai.ai',
      createdAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('lp_'),
      businessLine: '越南',
      channelCode: 'Tk88Vzq',
      channelName: 'KOL / TikTok 达人 / @minh_edu',
      packageId: 'PKG1003',
      packageName: 'Dino English 年度畅学商品包',
      validFrom: now.subtract(1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      validUntil: now.add(14, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      url: 'https://vn.dinoai.ai/website/landingpage/signin/?channel=Tk88Vzq',
      creator: 'admin@dinoai.ai',
      createdAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const roles: Role[] = [
    {
      id: 'role_growth',
      name: '市场投放 / 增长',
      desc: '渠道管理、落地页（生码 + 归因 + 投放链接）',
      builtin: true,
      dataScope: 'line',
      perms: {
        channels: 'operate',
        landing: 'operate',
        packages: 'view',
        coupons: 'view',
        users: 'none',
        sales: 'none',
        orders: 'none',
        system: 'none',
      },
    },
    {
      id: 'role_ops',
      name: '运营 / 商业化',
      desc: '商品包、优惠券、落地页，后期触达 / 服务编排',
      builtin: true,
      dataScope: 'line',
      perms: {
        channels: 'view',
        landing: 'operate',
        packages: 'operate',
        coupons: 'operate',
        users: 'view',
        sales: 'view',
        orders: 'view',
        system: 'none',
      },
    },
    {
      id: 'role_support',
      name: '客服 / 用户支持',
      desc: '用户中心、订单中心，后期单点触达答疑 / 关怀',
      builtin: true,
      dataScope: 'line',
      perms: {
        channels: 'none',
        landing: 'none',
        packages: 'none',
        coupons: 'none',
        users: 'operate',
        sales: 'operate',
        orders: 'view',
        system: 'none',
      },
    },
    {
      id: 'role_admin',
      name: '管理员 / 系统配置',
      desc: '账号鉴权、业务线 / 模版，角色权限',
      builtin: true,
      dataScope: 'all',
      perms: {
        channels: 'operate',
        landing: 'operate',
        packages: 'operate',
        coupons: 'operate',
        users: 'operate',
        sales: 'operate',
        orders: 'operate',
        system: 'operate',
      },
    },
    {
      id: 'role_mentor',
      name: '学习服务 / 班主任',
      desc: '体验跟进、续费引导、流失挽回（后期随服务节点引入）',
      builtin: true,
      planned: true,
      dataScope: 'line',
      perms: {
        channels: 'none',
        landing: 'none',
        packages: 'none',
        coupons: 'none',
        users: 'view',
        sales: 'operate',
        orders: 'view',
        system: 'none',
      },
    },
  ]

  const accounts: Account[] = [
    {
      id: uid('acc_'),
      email: 'admin@dinoai.ai',
      name: '系统管理员',
      roleId: 'role_admin',
      businessLines: [],
      status: '启用',
      lastLogin: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'growth.kr@dinoai.ai',
      name: '金敏修',
      roleId: 'role_growth',
      businessLines: ['韩国'],
      status: '启用',
      lastLogin: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'ops.vn@dinoai.ai',
      name: 'Trần Thị B',
      roleId: 'role_ops',
      businessLines: ['越南', '泰国'],
      status: '启用',
      lastLogin: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'cs.sa@dinoai.ai',
      name: 'Sara Al-Otaibi',
      roleId: 'role_support',
      businessLines: ['沙特'],
      status: '启用',
      lastLogin: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('acc_'),
      email: 'mentor.kr@dinoai.ai',
      name: '박지은',
      roleId: 'role_mentor',
      businessLines: ['韩国'],
      status: '停用',
    },
  ]

  const logs: AuditLog[] = [
    {
      id: uid('log_'),
      time: now.subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      actor: 'admin@dinoai.ai',
      module: 'system',
      action: 'sys.log.editRole',
      target: '客服 / 用户支持',
    },
    {
      id: uid('log_'),
      time: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      actor: 'admin@dinoai.ai',
      module: 'system',
      action: 'sys.log.addAcc',
      target: 'ops.vn@dinoai.ai',
    },
  ]

  // 外呼通话记录（演示：坐席对「我的跟进」中的线索发起外呼后归档的通话小结）
  const callRecords: CallRecord[] = [
    {
      id: uid('call_'),
      studentId: '2060199610824356004', customer: '지원', phone: '+82 10-8821-2390', businessLine: '韩国',
      result: '已接通', duration: '00:03', note: '【外呼自动记录】接通后沟通约 3 分钟，家长了解了销售内容并咨询优惠，对价格仍有顾虑，倾向再列出对比后决定，已约定下次回访。',
      agent: 'jiangshuang@dinoai.ai', time: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('call_'),
      studentId: '2060199610824356003', customer: 'Hana', phone: '+60 17-451 9920', businessLine: '马来',
      result: '已接通', duration: '00:43', note: '【外呼自动记录】接通后沟通约 3 分钟，家长了解了销售内容并咨询优惠，对价格仍有顾虑，倾向再列出对比后决定，已约定下次回访。',
      agent: 'jiangshuang@dinoai.ai', time: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('call_'),
      studentId: '2060199610824356003', customer: 'Hana', phone: '+60 17-451 9920', businessLine: '马来',
      result: '已接通', duration: '00:04', note: '【外呼自动记录】家长在忙暂不方便详谈，简单介绍了体验课，家长同意稍晚再联系，已征得同意约定时间为晚上 8 点后。',
      agent: 'jiangshuang@dinoai.ai', time: now.subtract(4, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('call_'),
      studentId: '2060199610824356003', customer: 'Hana', phone: '+60 17-451 9920', businessLine: '马来',
      result: '已接通', duration: '02:15', note: '已联系家长，确认体验时间，家长同意周末试听。',
      agent: 'admin@dinoai.ai', time: now.subtract(10, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: uid('call_'),
      studentId: '2060199610824356004', customer: '지원', phone: '+82 10-8821-2390', businessLine: '韩国',
      result: '无人接听', duration: '—', note: '首次外呼无人接通，稍后再试。',
      agent: 'admin@dinoai.ai', time: now.subtract(13, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  // 课时记录（课标）：已完课的体验课/正式课，附 Trial Report / Lesson Report 与回放
  const lessons: LessonRecord[] = [
    // 김지우（付费）：1 节体验课 + 3 节正式课，均已完课
    {
      id: uid('ls_'), studentId: '2060199610824355842', courseLabel: 'T1-U10-LC1-L2', lessonType: '体验课', status: '已完课',
      teacher: 'Emma W.', completedAt: now.subtract(20, 'day').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: '首次体验课，学生能听懂课堂指令并完成基础问答，对动物主题词汇表现出浓厚兴趣。',
        ratings: [
          { label: 'Speaking', score: 4 },
          { label: 'Listening', score: 4 },
          { label: 'Vocabulary', score: 3 },
          { label: 'Engagement', score: 5 },
        ],
        teacherComment: 'Ji-woo is an enthusiastic learner with a solid listening foundation. Recommended to start at Level 1 to strengthen speaking output.',
        homework: '复习本节 8 个动物单词，完成配套 App 的 Unit 10 跟读练习。',
      },
    },
    {
      id: uid('ls_'), studentId: '2060199610824355842', courseLabel: 'TCELA-L1-U2-LC1-11', lessonType: '正式课', status: '已完课',
      teacher: 'Emma W.', completedAt: now.subtract(6, 'day').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: '本节围绕 “My Family” 主题展开，学生能用完整句型介绍家庭成员，语音语调自然。',
        ratings: [
          { label: 'Participation', score: 5 },
          { label: 'Accuracy', score: 4 },
          { label: 'Fluency', score: 4 },
          { label: 'Homework', score: 5 },
        ],
        teacherComment: 'Great progress on sentence structure. Keep practicing the /th/ sound.',
        homework: '录制一段 1 分钟家庭介绍音频并上传。',
      },
    },
    {
      id: uid('ls_'), studentId: '2060199610824355842', courseLabel: 'TCELA-L1-U2-LC1-12', lessonType: '正式课', status: '已完课',
      teacher: 'Liam K.', completedAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: '复习 Unit 2 核心句型并完成小测，学生词汇掌握牢固，能主动发起对话。',
        ratings: [
          { label: 'Participation', score: 5 },
          { label: 'Accuracy', score: 5 },
          { label: 'Fluency', score: 4 },
          { label: 'Homework', score: 4 },
        ],
        teacherComment: 'Excellent retention. Ready to move on to Unit 3.',
        homework: '完成 Unit 2 单元测试，预习 Unit 3 单词卡。',
      },
    },
    // Abdullah（付费）：体验课 + 正式课
    {
      id: uid('ls_'), studentId: '2060199610824355843', courseLabel: 'T1-U3-LC1-L1', lessonType: '体验课', status: '已完课',
      teacher: 'Sophia R.', completedAt: now.subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: 'Trial lesson on greetings. Student is shy at first but warms up quickly and imitates pronunciation well.',
        ratings: [
          { label: 'Speaking', score: 3 },
          { label: 'Listening', score: 4 },
          { label: 'Vocabulary', score: 3 },
          { label: 'Engagement', score: 4 },
        ],
        teacherComment: 'Recommended Level 1. Focus on building confidence in speaking.',
        homework: 'Practice greetings with a family member.',
      },
    },
    {
      id: uid('ls_'), studentId: '2060199610824355843', courseLabel: 'TCELA-L1-U1-LC1-03', lessonType: '正式课', status: '已完课',
      teacher: 'Sophia R.', completedAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: '本节学习颜色与数字，学生能准确认读 1-10 并说出常见颜色。',
        ratings: [
          { label: 'Participation', score: 4 },
          { label: 'Accuracy', score: 4 },
          { label: 'Fluency', score: 3 },
          { label: 'Homework', score: 4 },
        ],
        teacherComment: 'Good improvement in confidence. Encourage more full-sentence answers.',
        homework: 'Complete the color matching worksheet.',
      },
    },
    // Seo-yeon（付费逾期）：仅体验课
    {
      id: uid('ls_'), studentId: '2060199610824355846', courseLabel: 'T1-U1-LC1-L1', lessonType: '体验课', status: '已完课',
      teacher: 'Olivia M.', completedAt: now.subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: '体验课表现活跃，能跟读并模仿老师的语音语调，具备一定听说基础。',
        ratings: [
          { label: 'Speaking', score: 4 },
          { label: 'Listening', score: 5 },
          { label: 'Vocabulary', score: 4 },
          { label: 'Engagement', score: 5 },
        ],
        teacherComment: 'Seo-yeon shows strong listening skills. Recommended Level 1.',
        homework: '复习本节问候语，完成 App 跟读。',
      },
    },
    // Somchai（未付费）：已完成 1 节体验课 → 用户状态显示「未付费-已体验」
    {
      id: uid('ls_'), studentId: '2060199610824355848', courseLabel: 'T1-U2-LC1-L1', lessonType: '体验课', status: '已完课',
      teacher: 'Noah T.', completedAt: now.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'), replayUrl: '#replay',
      report: {
        summary: '体验课完成，学生能跟读简单问候语并认读部分主题词汇，尚未付费购课。',
        ratings: [
          { label: 'Speaking', score: 3 },
          { label: 'Listening', score: 4 },
          { label: 'Vocabulary', score: 3 },
          { label: 'Engagement', score: 4 },
        ],
        teacherComment: 'Nice trial session. Recommended Level 1 to build a speaking foundation.',
        homework: '复习本节问候语，鼓励开口表达。',
      },
    },
    // Aisha（未付费）：体验课「进行中」且无完课体验课 → 用户状态显示「未付费-体验中」
    {
      id: uid('ls_'), studentId: '2060199610824355849', courseLabel: 'T1-U1-LC1-L1', lessonType: '体验课', status: '进行中',
      teacher: 'Mia L.', replayUrl: '#replay',
    },
  ]

  return { channels, students, orders, packages, coupons, landingPages, roles, accounts, logs, callRecords, lessons }
}

// ---------- 操作日志 ----------
export function addLog(entry: { actor: string; module: ModuleKey; action: string; target?: string }) {
  const log: AuditLog = {
    id: uid('log_'),
    time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...entry,
  }
  state = { ...state, logs: [log, ...state.logs].slice(0, 300) }
  emit()
}
