import { useEffect, useRef, useState } from 'react'
import { Button, Card, Form, Input, Tabs, Typography, message } from 'antd'
import { MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { EMAIL_SUFFIX, login } from '../auth'

const { Text, Title } = Typography

export default function Login() {
  const [form] = Form.useForm()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [countdown, setCountdown] = useState(0)
  const [sentCode, setSentCode] = useState<string>('')
  const timer = useRef<number>()

  useEffect(() => () => window.clearInterval(timer.current), [])

  const isValidEmail = (email?: string) =>
    !!email && email.toLowerCase().endsWith(`@${EMAIL_SUFFIX}`) && email.length > EMAIL_SUFFIX.length + 1

  const sendCode = async () => {
    try {
      const { email } = await form.validateFields(['email'])
      if (!isValidEmail(email)) {
        message.error(`仅支持 @${EMAIL_SUFFIX} 邮箱`)
        return
      }
      const code = String(Math.floor(100000 + Math.random() * 900000))
      setSentCode(code)
      message.success(`验证码已发送至 ${email}（演示验证码：${code}）`)
      setCountdown(60)
      timer.current = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            window.clearInterval(timer.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } catch {
      /* validation handled by form */
    }
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (!isValidEmail(values.email)) {
      message.error(`仅支持 @${EMAIL_SUFFIX} 邮箱`)
      return
    }
    if (!sentCode) {
      message.error('请先获取验证码')
      return
    }
    if (values.code !== sentCode) {
      message.error('验证码错误')
      return
    }
    message.success(tab === 'register' ? '注册成功，正在进入...' : '登录成功')
    login(values.email)
  }

  return (
    <div className="login-bg">
      <Card style={{ width: 420, boxShadow: '0 12px 40px rgba(31,99,255,0.12)', borderRadius: 16 }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="brand-row" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <img src="/dino.svg" width={38} height={38} alt="logo" />
            <Title level={3} style={{ margin: 0 }}>
              DinoAI 运营管理平台
            </Title>
          </div>
          <Text type="secondary">邮箱验证码登录 · 仅限 @{EMAIL_SUFFIX}</Text>
        </div>

        <Tabs
          centered
          activeKey={tab}
          onChange={(k) => setTab(k as 'login' | 'register')}
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />

        <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              {
                validator: (_, v) =>
                  isValidEmail(v) ? Promise.resolve() : Promise.reject(new Error(`请输入 @${EMAIL_SUFFIX} 邮箱`)),
              },
            ]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder={`yourname@${EMAIL_SUFFIX}`} />
          </Form.Item>

          <Form.Item label="验证码" required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="code" noStyle rules={[{ required: true, message: '请输入验证码' }]}>
                <Input size="large" prefix={<SafetyCertificateOutlined />} placeholder="6 位验证码" maxLength={6} />
              </Form.Item>
              <Button size="large" onClick={sendCode} disabled={countdown > 0} style={{ width: 130, flex: '0 0 auto' }}>
                {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
              </Button>
            </div>
          </Form.Item>

          <Button type="primary" size="large" block htmlType="submit" style={{ marginTop: 6 }}>
            {tab === 'register' ? '注册并登录' : '登录'}
          </Button>
        </Form>
      </Card>
    </div>
  )
}
