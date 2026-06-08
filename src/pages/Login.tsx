import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Mail, Lock, Eye, EyeOff, Mic, ArrowLeft } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const login = useAppStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('请输入邮箱')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }

    const success = await login(email, password)
    if (success) {
      navigate('/')
    } else {
      setError('登录失败，请检查邮箱和密码')
    }
  }

  return (
    <div className="min-h-screen bg-deep-900 bg-noise flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald/5 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
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
            <h1 className="text-2xl font-heading font-bold text-white">语音翻译系统</h1>
            <p className="text-sm text-deep-600 mt-1">登录以继续使用</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-sm text-deep-600 mb-1 block">
                邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="请输入邮箱"
                  autoComplete="email"
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="text-sm text-deep-600 mb-1 block">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  aria-describedby={error ? 'login-error' : undefined}
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
            </div>

            {/* Error */}
            {error && (
              <p id="login-error" className="text-sm text-rose" role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <button type="submit" className="btn-primary w-full">
              登录
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-deep-600 mt-6">
            还没有账号？{' '}
            <Link to="/register" className="text-emerald hover:text-emerald-light transition-colors">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
