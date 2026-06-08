import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { useAppStore } from '@/store/useAppStore'

// Restore user session on app startup
const userId = localStorage.getItem('user_id')
if (userId) {
  useAppStore.getState().loadProfile()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
