import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Mic, History, Settings, Zap, ArrowRight, Clock, CheckCircle, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '@/components/StatCard'
import { CHART_COLORS } from '@/constants'

function AnimatedNumber({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Cleanup any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = undefined
    }

    // Reset to 0 for new target
    setValue(0)

    let start = 0
    const step = target / (duration / 16)
    timerRef.current = window.setInterval(() => {
      start += step
      if (start >= target) {
        setValue(target)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setValue(Math.floor(start))
      }
    }, 16)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [target, duration])

  return <span>{value.toLocaleString()}</span>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const stats = useAppStore((s) => s.stats)
  const statsLoading = useAppStore((s) => s.statsLoading)
  const loadStats = useAppStore((s) => s.loadStats)
  const translationRecords = useAppStore((s) => s.translationRecords)
  const loadTranslations = useAppStore((s) => s.loadTranslations)

  useEffect(() => {
    loadStats()
    loadTranslations(5, 0)
  }, [loadStats, loadTranslations])

  // Use real stats from API, with fallback during loading
  const totalTranslations = stats?.totalTranslations ?? 0
  const todayTranslations = stats?.todayTranslations ?? 0
  const successRate = stats?.successRate ?? 0
  const avgDuration = stats?.avgDuration ?? 0
  const dailyTrend = stats?.dailyTrend ?? []
  const languageDist = stats?.languageDist ?? []
  const hourlyUsage = stats?.hourlyUsage ?? []

  // Calculate daily change for display
  const lastDayCount = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1]?.count || 0 : 0
  const prevDayCount = dailyTrend.length > 1 ? dailyTrend[dailyTrend.length - 2]?.count || 0 : 0
  const dailyChangeNum = prevDayCount > 0 ? ((lastDayCount - prevDayCount) / prevDayCount * 100) : 0
  const dailyChange = dailyChangeNum.toFixed(0)

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-white">
          欢迎回来，<span className="text-gradient">{user?.username}</span>
        </h1>
        <p className="text-deep-600 mt-2">以下是您的语音翻译系统概览</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/translate')}
          className="glass-card p-6 text-left group transition-all duration-300 hover:border-emerald/30 hover:shadow-lg hover:shadow-emerald/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-white">开始翻译</h3>
              <p className="text-sm text-deep-600">语音识别与翻译</p>
            </div>
            <ArrowRight className="w-5 h-5 text-deep-600 group-hover:text-emerald group-hover:translate-x-1 transition-all" />
          </div>
        </button>

        <button
          onClick={() => navigate('/history')}
          className="glass-card p-6 text-left group transition-all duration-300 hover:border-amber/30 hover:shadow-lg hover:shadow-amber/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber to-amber/70 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-white">历史记录</h3>
              <p className="text-sm text-deep-600">查看翻译历史</p>
            </div>
            <ArrowRight className="w-5 h-5 text-deep-600 group-hover:text-amber group-hover:translate-x-1 transition-all" />
          </div>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="glass-card p-6 text-left group transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-white">系统设置</h3>
              <p className="text-sm text-deep-600">配置偏好参数</p>
            </div>
            <ArrowRight className="w-5 h-5 text-deep-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        </button>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-deep-700 rounded w-20 mb-3" />
              <div className="h-8 bg-deep-700 rounded w-16 mb-3" />
              <div className="h-3 bg-deep-700 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总翻译次数"
            value={<AnimatedNumber target={totalTranslations} />}
            change={`较昨日 ${dailyChangeNum >= 0 ? '+' : ''}${dailyChange}%`}
            changeType={dailyChangeNum >= 0 ? 'positive' : 'negative'}
            icon={Zap}
            iconColor="bg-gradient-to-br from-emerald to-emerald-dark"
          />
          <StatCard
            title="今日翻译"
            value={<AnimatedNumber target={todayTranslations} />}
            change="活跃时段"
            changeType="neutral"
            icon={Clock}
            iconColor="bg-gradient-to-br from-amber to-amber/70"
          />
          <StatCard
            title="识别成功率"
            value={`${successRate}%`}
            change="持续监控中"
            changeType="positive"
            icon={CheckCircle}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="平均耗时"
            value={`${avgDuration}s`}
            change="性能优化中"
            changeType="neutral"
            icon={BarChart3}
            iconColor="bg-gradient-to-br from-purple-500 to-purple-600"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-heading font-semibold text-white">翻译量趋势</h2>
            <span className="text-xs text-deep-600 px-3 py-1 rounded-full bg-deep-700/40">近14天</span>
          </div>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(71, 85, 105, 0.3)" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-deep-600 text-sm">
              暂无趋势数据
            </div>
          )}
        </div>

        {/* Language distribution */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-heading font-semibold text-white mb-6">语速分布</h2>
          {languageDist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={languageDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {languageDist.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {languageDist.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <span className="text-deep-600">{item.name}</span>
                    </div>
                    <span className="text-white font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-deep-600 text-sm">
              暂无分布数据
            </div>
          )}
        </div>
      </div>

      {/* Hourly usage heatmap */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">24小时使用热力图</h2>
        {hourlyUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={hourlyUsage}>
              <defs>
                <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#475569" tick={{ fontSize: 10 }} interval={3} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(71, 85, 105, 0.4)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#hourlyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-deep-600 text-sm">
            暂无使用数据
          </div>
        )}
      </div>

      {/* Recent translations */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-heading font-semibold text-white">最近翻译</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-emerald hover:text-emerald-light transition-colors"
          >
            查看全部 →
          </button>
        </div>
        {translationRecords.length > 0 ? (
          <div className="space-y-3">
            {translationRecords.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="glass-panel p-4 hover:border-deep-600/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{record.chineseText}</p>
                    <p className="text-xs text-deep-600 mt-1 truncate">{record.englishText}</p>
                  </div>
                  <span className="text-xs text-deep-600 whitespace-nowrap">
                    {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-deep-600 text-sm">
            暂无翻译记录
          </div>
        )}
      </div>
    </div>
  )
}
