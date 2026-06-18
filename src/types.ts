export type BusinessLine = '韩国' | '沙特' | '马来' | '越南' | '其他'

export const BUSINESS_LINES: BusinessLine[] = ['韩国', '沙特', '马来', '越南', '其他']

// 业务线 -> 本地币种
export const LINE_CURRENCY: Record<BusinessLine, { code: string; label: string }> = {
  韩国: { code: 'KRW', label: '韩元 (KRW)' },
  沙特: { code: 'SAR', label: '沙特里亚尔 (SAR)' },
  马来: { code: 'MYR', label: '马来西亚林吉特 (MYR)' },
  越南: { code: 'VND', label: '越南盾 (VND)' },
  其他: { code: 'USD', label: '美元 (USD)' },
}

export const COUNTRY_CODE: Record<BusinessLine, string> = {
  韩国: '+82',
  沙特: '+966',
  马来: '+60',
  越南: '+84',
  其他: '+1',
}

export type ChannelLevelNode = {
  id: string
  name: string
  level: 1 | 2 | 3
  code?: string // 渠道 code（在该级渠道下生成）
  children: ChannelLevelNode[]
}

export type ChannelType = {
  id: string
  name: string // 自然流量 / landingpage / KOL ...
  children: ChannelLevelNode[]
}

export type UserStatus = '注册' | '体验' | '付费' | '流失'

export type Student = {
  studentId: string
  name: string
  enName?: string
  localName?: string
  gender?: '男' | '女' | '其他'
  birthday?: string // YYYY-MM-DD
  phone: string
  businessLine: BusinessLine
  registerChannel: string
  countryCode: string
  channelCode: string
  registerTime: string // Beijing
  status: UserStatus
}

export type OrderStatus = '待支付' | '已支付' | '已退款' | '已取消'

export type Order = {
  orderId: string
  productName: string
  studentId: string
  userStatus: UserStatus
  orderStatus: OrderStatus
  originalPrice: number
  paidAmount: number
  payMethod: 'App Store' | 'Google Play' | 'Stripe' | 'PayPal'
  currency: string
  paidTime?: string
}

export type PackageStatus = '上架' | '下架'

export type CoursePackage = {
  id: string
  businessLine: BusinessLine
  name: string
  currency: string
  price: number
  validStart: string // 有效期开始时间 YYYY-MM-DD HH:mm:ss
  validEnd: string // 有效期结束时间 YYYY-MM-DD HH:mm:ss
  creator: string
  status: PackageStatus
  createdAt: string
}

export type CouponStatus = '已生效' | '已结束'

export type CouponProduct = {
  id: string
  name: string
  price: number
}

export type Coupon = {
  id: string
  name: string
  code: string
  businessLine: BusinessLine
  couponType: '满减券'
  currency: string
  creator: string
  total: number
  remaining: number
  // 发放及领取规则
  claimStart: string
  claimEnd: string
  // 使用规则
  useStart: string
  useEnd: string
  products: CouponProduct[]
  // 权益规则（满减）
  thresholdAmount: number
  deductAmount: number
  status: CouponStatus
  createdAt: string
}
