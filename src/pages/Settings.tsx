import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { User, Mail, Save, Volume2, Mic, Loader2 } from 'lucide-react'
import { VOICE_OPTIONS, SPEED_OPTIONS, APP_VERSION } from '@/constants'

export default function Settings() {
  const user = useAppStore((s) => s.user)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const updatePreferences = useAppStore((s) => s.updatePreferences)

  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [speed, setSpeed] = useState(user?.preferences.defaultSpeed || 'normal')
  const [voice, setVoice] = useState(user?.preferences.defaultVoice || 'female_us')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setUsername(user?.username || '')
    setEmail(user?.email || '')
    setSpeed(user?.preferences.defaultSpeed || 'normal')
    setVoice(user?.preferences.defaultVoice || 'female_us')
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all([
        updateProfile({ username, email }),
        updatePreferences({ defaultSpeed: speed as 'slow' | 'normal' | 'fast', defaultVoice: voice }),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white">个人设置</h1>
        <p className="text-deep-600 mt-2">管理您的账户信息和系统偏好</p>
      </div>

      {/* Account info */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald" />
          账户信息
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald/30 to-emerald-dark/30 flex items-center justify-center">
            <User className="w-8 h-8 text-emerald" />
          </div>
          <div>
            <p className="text-white font-medium">{user?.username}</p>
            <p className="text-sm text-deep-600">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="text-sm text-deep-600 mb-1 block">用户名</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="请输入用户名" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm text-deep-600 mb-1 block">邮箱</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="请输入邮箱" />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-6 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald" />
          语音偏好
        </h2>

        <div className="mb-6">
          <label className="text-sm text-deep-600 mb-2 block">默认语速</label>
          <div className="flex gap-2">
            {SPEED_OPTIONS.map((s) => (
              <button key={s.id} onClick={() => setSpeed(s.id)} className={`flex-1 py-3 px-4 rounded-xl text-sm transition-all duration-200 ${speed === s.id ? 'bg-emerald/20 text-emerald border border-emerald/30' : 'bg-deep-700/30 text-deep-600 border border-transparent hover:bg-deep-700/50'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-deep-600 mb-2 block">默认音色</label>
          <div className="flex gap-2">
            {VOICE_OPTIONS.map((v) => (
              <button key={v.id} onClick={() => setVoice(v.id)} className={`flex-1 py-3 px-3 rounded-xl text-center transition-all duration-200 ${voice === v.id ? 'bg-emerald/20 text-emerald border border-emerald/30' : 'bg-deep-700/30 text-deep-600 border border-transparent hover:bg-deep-700/50'}`}>
                <span className="text-2xl block">{v.emoji}</span>
                <span className="text-xs mt-1 block">{v.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-4 flex items-center gap-2">
          <Mic className="w-5 h-5 text-emerald" />
          系统信息
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-deep-700/30">
            <span className="text-deep-600">系统版本</span>
            <span className="text-white">{APP_VERSION}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-deep-700/30">
            <span className="text-deep-600">语音引擎</span>
            <span className="text-white">Whisper + edge-tts</span>
          </div>
          <div className="flex justify-between py-2 border-b border-deep-700/30">
            <span className="text-deep-600">翻译引擎</span>
            <span className="text-white">Marian NMT</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-deep-600">注册时间</span>
            <span className="text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? '保存中...' : '保存设置'}
        </button>
        {saved && <span className="text-sm text-emerald animate-pulse">设置已保存</span>}
      </div>
    </div>
  )
}
