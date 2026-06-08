import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Languages, History, Settings, Mic, BookOpen, Star } from 'lucide-react'
import { APP_VERSION } from '@/constants'

interface NavItem {
  path: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/dashboard/translate', label: '语音翻译', icon: Languages },
  { path: '/dashboard/history', label: '历史记录', icon: History },
  { path: '/dashboard/phrases', label: '快捷短语', icon: Star },
  { path: '/dashboard/dictionary', label: '语音词典', icon: BookOpen },
  { path: '/dashboard/settings', label: '个人设置', icon: Settings },
]

export default function Sidebar({ currentPath }: { currentPath: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald to-emerald-dark flex items-center justify-center shadow-lg shadow-emerald/20">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-white">语音翻译</h1>
            <p className="text-xs text-deep-600">Voice Translator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" aria-label="主导航菜单">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.path
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`nav-item w-full ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-deep-700/30">
        <div className="glass-panel p-3">
          <p className="text-xs text-deep-600">系统版本 {APP_VERSION}</p>
          <p className="text-xs text-deep-600 mt-1">基于 AI 语音技术</p>
        </div>
      </div>
    </div>
  )
}
