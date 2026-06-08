import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Auth, history, stats -> Express (Node.js)
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/user': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/translations': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/stats': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Speech processing -> Python FastAPI
      '/api/speech': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/translate': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/config': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/history': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/audio': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/phrases': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/dictionary': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Audio files -> Python FastAPI serves uploads
      '/uploads/audio': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads/, ''),
      },
    },
  },
})
