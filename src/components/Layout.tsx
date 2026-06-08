import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { Menu, X } from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-deep-900 bg-noise flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-deep-900/95 backdrop-blur-xl border-r border-deep-700/30 
          transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="主导航"
      >
        <div className="flex items-center justify-between p-5 lg:hidden">
          <span className="text-lg font-heading font-bold text-gradient">菜单</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-deep-800 transition-colors"
            aria-label="关闭菜单"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar currentPath={location.pathname} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto max-w-7xl mx-auto w-full" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
