import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Translate from '@/pages/Translate'
import History from '@/pages/History'
import Settings from '@/pages/Settings'
import Phrases from '@/pages/Phrases'
import Dictionary from '@/pages/Dictionary'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  return (
    <Routes>
      {/* Landing page: shown to unauthenticated users, redirects to dashboard if logged in */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
      />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated routes under /dashboard */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="translate" element={<Translate />} />
        <Route path="history" element={<History />} />
        <Route path="phrases" element={<Phrases />} />
        <Route path="dictionary" element={<Dictionary />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
