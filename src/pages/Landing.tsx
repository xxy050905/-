import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mic, Languages, Zap, Headphones, Globe, ChevronRight, Play, Star, ArrowRight } from 'lucide-react'

// Animated number counter for stats
function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const stepValue = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += stepValue
      if (current >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target])

  return <span>{value.toLocaleString()}</span>
}

export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-rotate features
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const features = [
    {
      icon: Mic,
      title: '智能语音识别',
      desc: '采用 Whisper 深度学习模型，精准识别中文语音，支持多种口音和语速。',
    },
    {
      icon: Globe,
      title: '精准中英翻译',
      desc: '基于百度翻译 API，提供准确流畅的中文到英文翻译服务。',
    },
    {
      icon: Headphones,
      title: '自然语音合成',
      desc: 'Edge-TTS 技术生成自然流畅的英文语音，支持多种音色和语速。',
    },
    {
      icon: Zap,
      title: '实时处理',
      desc: '端到端语音处理流程，从录音到翻译输出一气呵成，高效便捷。',
    },
  ]

  const stats = [
    { value: 98, suffix: '%', label: '识别准确率' },
    { value: 5000, suffix: '+', label: '注册用户' },
    { value: 50000, suffix: '+', label: '翻译次数' },
    { value: 10, suffix: '种', label: '音色选择' },
  ]

  const testimonials = [
    { name: '李明', role: '语言学习者', text: '语音识别很准确，翻译质量也很高，对我的英语学习帮助很大！' },
    { name: '张婷', role: '商务人士', text: '出差时经常使用，快速翻译商务对话，非常实用。' },
    { name: '王浩', role: '旅行者', text: '界面简洁好用，发音自然，旅行沟通无障碍。' },
  ]

  return (
    <div className="min-h-screen bg-deep-900 bg-noise overflow-hidden">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-deep-900/90 backdrop-blur-xl border-b border-deep-700/30 shadow-lg' : ''
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-white">语音翻译系统</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-deep-600 hover:text-white transition-colors px-4 py-2"
            >
              登录
            </Link>
            <Link
              to="/register"
              className="btn-primary text-sm px-5 py-2"
            >
              免费注册
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald/10 border border-emerald/20 mb-8">
            <Star className="w-4 h-4 text-emerald" />
            <span className="text-sm text-emerald">基于 AI 语音技术</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold text-white leading-tight mb-6">
            让语言沟通
            <br />
            <span className="text-gradient">无处不在</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-deep-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            语音翻译系统为您提供从语音识别、智能翻译到语音合成的完整服务，
            <br className="hidden sm:block" />
            让跨语言交流变得简单高效。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group"
            >
              立即开始
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary text-lg px-8 py-4"
            >
              已有账号？登录
            </button>
          </div>

          {/* Hero visual - waveform animation */}
          <div className="relative max-w-2xl mx-auto">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-center justify-center gap-1 h-16 mb-4">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-emerald to-emerald-light animate-pulse"
                    style={{
                      height: `${Math.sin(i * 0.3 + activeFeature) * 30 + 40}px`,
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: `${1 + Math.random()}s`,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-deep-600">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald" />
                  <span>中文语音输入</span>
                </div>
                <ChevronRight className="w-4 h-4" />
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-emerald" />
                  <span>智能翻译</span>
                </div>
                <ChevronRight className="w-4 h-4" />
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-emerald" />
                  <span>英文语音输出</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-deep-600 animate-bounce">
          <span className="text-xs">向下了解更多</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
              核心功能
            </h2>
            <p className="text-deep-600 max-w-xl mx-auto">
              一站式语音翻译解决方案，覆盖从输入到输出的完整流程
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isActive = activeFeature === index
              return (
                <div
                  key={index}
                  className={`glass-card p-6 transition-all duration-500 cursor-pointer ${
                    isActive ? 'border-emerald/30 shadow-lg shadow-emerald/10' : ''
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-emerald to-emerald-dark scale-110'
                      : 'bg-deep-700/50'
                  }`}>
                    <Icon className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-emerald'}`} />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-deep-600 leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8 sm:p-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-heading font-bold text-gradient mb-2">
                    <AnimatedNumber target={stat.value} />
                    {stat.suffix}
                  </div>
                  <p className="text-sm text-deep-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
              如何使用
            </h2>
            <p className="text-deep-600 max-w-xl mx-auto">
              简单三步，完成语音翻译
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '输入语音', desc: '点击录音按钮或上传音频文件，系统自动识别语音内容。' },
              { step: '02', title: '智能翻译', desc: 'AI 自动将中文翻译为英文，准确流畅。' },
              { step: '03', title: '语音输出', desc: '选择音色和语速，播放或下载英文语音。' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="glass-card p-8">
                  <span className="text-5xl font-heading font-bold text-emerald/20">{item.step}</span>
                  <h3 className="text-xl font-heading font-semibold text-white mt-2 mb-3">{item.title}</h3>
                  <p className="text-sm text-deep-600 leading-relaxed">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="w-8 h-8 text-emerald/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
              用户评价
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item, index) => (
              <div key={index} className="glass-card p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber fill-amber" />
                  ))}
                </div>
                <p className="text-sm text-deep-600 mb-6 leading-relaxed italic">"{item.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center text-white font-medium text-sm">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-deep-600">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card p-12 border-emerald/20">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
              准备好开始了吗？
            </h2>
            <p className="text-deep-600 mb-8 max-w-lg mx-auto">
              免费注册，体验完整的语音翻译服务，让跨语言沟通变得轻松简单。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group"
              >
                免费注册
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary text-lg px-8 py-4"
              >
                已有账号登录
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-deep-700/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-heading font-bold text-white">语音翻译系统</span>
              </div>
              <p className="text-sm text-deep-600">
                基于 AI 语音技术的智能翻译平台
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">产品</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-sm text-deep-600 hover:text-white transition-colors">语音翻译</Link></li>
                <li><span className="text-sm text-deep-600">快捷短语</span></li>
                <li><span className="text-sm text-deep-600">语音词典</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">支持</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-deep-600">帮助中心</span></li>
                <li><span className="text-sm text-deep-600">使用指南</span></li>
                <li><span className="text-sm text-deep-600">联系我们</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">法律</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-deep-600">隐私政策</span></li>
                <li><span className="text-sm text-deep-600">服务条款</span></li>
                <li><span className="text-sm text-deep-600">用户协议</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-deep-700/30 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-deep-600">
              &copy; {new Date().getFullYear()} 语音翻译系统. All rights reserved.
            </p>
            <p className="text-xs text-deep-600">
              基于 Whisper、Edge-TTS 和百度翻译 API 构建
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
