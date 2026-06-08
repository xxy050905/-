import { create } from 'zustand'
import type { User, TranslationRecord, SystemStats, TranslationRecordResponse } from '@/types'
import { mapUserResponseToUser, mapTranslationRecordResponse } from '@/types'
import { authApi, translationApi, statsApi } from '@/api/client'

interface AppState {
  user: User | null
  isAuthenticated: boolean
  translationRecords: TranslationRecord[]
  stats: SystemStats | null
  statsLoading: boolean
  recordsTotal: number
  isRecording: boolean
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  loadProfile: () => Promise<void>
  
  // Profile actions
  updateProfile: (data: Partial<User>) => Promise<void>
  updatePreferences: (prefs: Partial<User['preferences']>) => Promise<void>
  
  // Translation actions
  loadTranslations: (limit?: number, offset?: number) => Promise<void>
  addTranslation: (record: { chinese_text: string; english_text: string; duration?: number; speed?: string; voice?: string }) => Promise<void>
  deleteTranslation: (id: string) => Promise<void>
  
  // Stats actions
  loadStats: () => Promise<void>
  
  // Recording
  setRecording: (recording: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  translationRecords: [],
  stats: null,
  statsLoading: false,
  recordsTotal: 0,
  isRecording: false,
  
  login: async (email, password) => {
    try {
      const data = await authApi.login(email, password)
      set({ user: mapUserResponseToUser(data.user), isAuthenticated: true })
      return true
    } catch {
      return false
    }
  },
  
  register: async (username, email, password) => {
    try {
      const data = await authApi.register(username, email, password)
      set({ user: mapUserResponseToUser(data.user), isAuthenticated: true })
      return true
    } catch {
      return false
    }
  },
  
  logout: () => {
    localStorage.removeItem('user_id')
    set({ user: null, isAuthenticated: false, translationRecords: [], stats: null })
  },
  
  loadProfile: async () => {
    try {
      const data = await authApi.getProfile()
      set({ user: mapUserResponseToUser(data.user), isAuthenticated: true })
    } catch {
      localStorage.removeItem('user_id')
    }
  },
  
  updateProfile: async (data) => {
    const result = await authApi.updateProfile(data as Record<string, string>)
    set({ user: mapUserResponseToUser(result.user) })
  },
  
  updatePreferences: async (prefs) => {
    const updateData: Record<string, string | undefined> = {}
    if (prefs.defaultSpeed) updateData.default_speed = prefs.defaultSpeed
    if (prefs.defaultVoice) updateData.default_voice = prefs.defaultVoice
    const result = await authApi.updateProfile(updateData)
    set({ user: mapUserResponseToUser(result.user) })
  },
  
  loadTranslations: async (limit = 50, offset = 0) => {
    const data = await translationApi.list(limit, offset)
    const records = (data.translations as TranslationRecordResponse[]).map(
      mapTranslationRecordResponse
    )
    set({ translationRecords: records, recordsTotal: data.total })
  },
  
  addTranslation: async (record) => {
    const result = await translationApi.create(record)
    set((state) => ({
      translationRecords: [mapTranslationRecordResponse(result.translation as TranslationRecordResponse), ...state.translationRecords],
    }))
  },
  
  deleteTranslation: async (id) => {
    await translationApi.delete(id)
    set((state) => ({
      translationRecords: state.translationRecords.filter((r) => r.id !== id),
    }))
  },
  
  loadStats: async () => {
    set({ statsLoading: true })
    try {
      const data = await statsApi.getStats()
      set({ stats: data.stats as SystemStats })
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      set({ statsLoading: false })
    }
  },
  
  setRecording: (recording) => {
    set({ isRecording: recording })
  },
}))
