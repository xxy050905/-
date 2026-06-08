import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Menu, Bell, User } from 'lucide-react'

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 glass-panel border-x-0 rounded-none px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Menu button (mobile) + Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-deep-700/50 transition-colors"
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav aria-label="面包屑导航">
            <ol className="hidden sm:flex items-center gap-2 text-sm text-deep-600">
              <li>首页</li>
            </ol>
          </nav>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg hover:bg-deep-700/50 transition-colors relative"
            aria-label="通知"
          >
            <Bell className="w-5 h-5 text-deep-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald rounded-full" />
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-deep-700/40 transition-colors"
            aria-label="用户设置"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald/30 to-emerald-dark/30 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald" />
            </div>
            <span className="hidden md:block text-sm font-medium text-white">
              {user?.username || '用户'}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="hidden sm:block text-xs text-deep-600 hover:text-rose transition-colors px-3 py-2 rounded-lg hover:bg-rose/10"
            aria-label="退出登录"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  )
}
