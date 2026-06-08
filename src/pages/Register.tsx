import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { User, Mail, Lock, Eye, EyeOff, Mic, ArrowLeft, CheckCircle } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const register = useAppStore((s) => s.register)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('请输入有效的邮箱')
      return
    }
    if (password.length < 6) {
      setError('密码至少6个字符')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    const success = await register(username, email, password)
    if (success) {
      navigate('/')
    } else {
      setError('注册失败，请重试')
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { level: 0, text: '', color: '' }
    if (pwd.length < 6) return { level: 1, text: '弱', color: 'bg-rose' }
    if (pwd.length < 10) return { level: 2, text: '中', color: 'bg-amber' }
    return { level: 3, text: '强', color: 'bg-emerald' }
  }

  const strength = getPasswordStrength(password)

  return (
    <div className="min-h-screen bg-deep-900 bg-noise flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-60 h-60 bg-emerald/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-emerald/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-deep-600 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center mx-auto shadow-lg shadow-emerald/25 mb-4">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white">创建账号</h1>
            <p className="text-sm text-deep-600 mt-1">注册以使用完整功能</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="reg-username" className="text-sm text-deep-600 mb-1 block">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="text-sm text-deep-600 mb-1 block">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="请输入邮箱"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="text-sm text-deep-600 mb-1 block">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="至少6个字符"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-deep-600 hover:text-white transition-colors"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength */}
              {password && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-deep-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.level / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-deep-600">{strength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" className="text-sm text-deep-600 mb-1 block">
                确认密码
              </label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
                <input
                  id="reg-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-field pl-10 ${
                    confirmPassword && confirmPassword !== password ? 'border-rose/50 focus:border-rose/50 focus:ring-rose/20' : ''
                  }`}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-rose" role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <button type="submit" className="btn-primary w-full">
              注册
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-deep-600 mt-6">
            已有账号？{' '}
            <Link to="/login" className="text-emerald hover:text-emerald-light transition-colors">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
