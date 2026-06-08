import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { phrasesApi, speechApi } from '@/api/client'
import type { Phrase, PhraseResponse } from '@/types'
import { Plus, Trash2, Play, Loader2, XCircle, Star } from 'lucide-react'

function mapPhraseResponse(r: PhraseResponse): Phrase {
  return {
    id: r.id,
    chineseText: r.chinese_text,
    englishText: r.english_text,
    category: r.category,
    createdAt: r.created_at,
  }
}

const PRESET_PHRASES = [
  { chinese_text: '你好', english_text: 'Hello', category: 'greeting' },
  { chinese_text: '谢谢', english_text: 'Thank you', category: 'greeting' },
  { chinese_text: '再见', english_text: 'Goodbye', category: 'greeting' },
  { chinese_text: '请问在哪里？', english_text: 'Excuse me, where is it?', category: 'travel' },
  { chinese_text: '多少钱？', english_text: 'How much is it?', category: 'travel' },
  { chinese_text: '请帮帮我', english_text: 'Please help me', category: 'emergency' },
]

const CATEGORY_LABELS: Record<string, string> = {
  greeting: '问候',
  travel: '旅行',
  emergency: '紧急',
  custom: '自定义',
}

export default function Phrases() {
  const { user } = useAppStore()
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newChinese, setNewChinese] = useState('')
  const [newEnglish, setNewEnglish] = useState('')
  const [newCategory, setNewCategory] = useState('custom')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [addMode, setAddMode] = useState<'manual' | 'preset'>('preset')

  useEffect(() => {
    loadPhrases()
  }, [])

  const loadPhrases = async () => {
    try {
      const data = await phrasesApi.list()
      setPhrases(data.phrases.map(mapPhraseResponse))
    } catch (err: any) {
      setErrorMessage(`加载失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPreset = async (preset: typeof PRESET_PHRASES[0]) => {
    try {
      const data = await phrasesApi.create(preset)
      setPhrases(prev => [mapPhraseResponse(data.phrase), ...prev])
    } catch (err: any) {
      setErrorMessage(`添加失败: ${err.message}`)
    }
  }

  const handleAddCustom = async () => {
    if (!newChinese.trim() || !newEnglish.trim()) return
    try {
      const data = await phrasesApi.create({
        chinese_text: newChinese.trim(),
        english_text: newEnglish.trim(),
        category: newCategory,
      })
      setPhrases(prev => [mapPhraseResponse(data.phrase), ...prev])
      setNewChinese('')
      setNewEnglish('')
      setNewCategory('custom')
      setShowAddModal(false)
    } catch (err: any) {
      setErrorMessage(`添加失败: ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await phrasesApi.delete(id)
      setPhrases(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      setErrorMessage(`删除失败: ${err.message}`)
    }
  }

  const handlePlay = async (phrase: Phrase) => {
    if (playingId === phrase.id) {
      setPlayingId(null)
      return
    }
    setPlayingId(phrase.id)
    try {
      const result = await speechApi.synthesize(phrase.englishText)
      const audio = new Audio(result.audio_url.startsWith('/') ? `http://localhost:8001${result.audio_url}` : result.audio_url)
      audio.onended = () => setPlayingId(null)
      audio.onerror = () => setPlayingId(null)
      audio.play()
    } catch {
      setPlayingId(null)
    }
  }

  const existingKeys = phrases.map(p => `${p.chineseText}|${p.englishText}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">快捷短语</h1>
          <p className="text-deep-600 mt-2">保存常用翻译，一键播放语音</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          添加短语
        </button>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="glass-card p-4 border-rose/30 flex items-center gap-3" role="alert">
          <XCircle className="w-5 h-5 text-rose flex-shrink-0" />
          <p className="text-sm text-rose">{errorMessage}</p>
          <button onClick={() => setErrorMessage('')} className="ml-auto text-rose hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald animate-spin" />
        </div>
      ) : (
        <>
          {/* Phrases grid */}
          {phrases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phrases.map((phrase) => (
                <div key={phrase.id} className="glass-card p-5 group hover:border-emerald/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald/20 text-emerald">
                      {CATEGORY_LABELS[phrase.category] || phrase.category}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePlay(phrase)}
                        className={`p-1.5 rounded-lg transition-colors ${playingId === phrase.id ? 'bg-emerald text-white' : 'hover:bg-deep-700/50 text-deep-600 hover:text-white'}`}
                        aria-label="播放语音"
                      >
                        {playingId === phrase.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(phrase.id)}
                        className="p-1.5 rounded-lg hover:bg-rose/20 text-deep-600 hover:text-rose transition-colors"
                        aria-label="删除短语"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-white font-medium mb-1">{phrase.chineseText}</p>
                  <p className="text-sm text-deep-600">{phrase.englishText}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Star className="w-12 h-12 text-deep-700 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">暂无快捷短语</p>
              <p className="text-sm text-deep-600 mb-6">添加常用短语，方便快速使用和播放</p>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                添加第一个短语
              </button>
            </div>
          )}
        </>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-heading font-bold text-white mb-4">添加短语</h2>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setAddMode('preset')}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${addMode === 'preset' ? 'bg-emerald/20 text-emerald' : 'bg-deep-700/30 text-deep-600 hover:bg-deep-700/50'}`}
              >
                预设短语
              </button>
              <button
                onClick={() => setAddMode('manual')}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${addMode === 'manual' ? 'bg-emerald/20 text-emerald' : 'bg-deep-700/30 text-deep-600 hover:bg-deep-700/50'}`}
              >
                手动输入
              </button>
            </div>

            {addMode === 'preset' ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {PRESET_PHRASES.map((preset, i) => {
                  const exists = existingKeys.includes(`${preset.chinese_text}|${preset.english_text}`)
                  return (
                    <button
                      key={i}
                      onClick={() => handleAddPreset(preset)}
                      disabled={exists}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${exists ? 'opacity-40 cursor-not-allowed bg-deep-700/20' : 'hover:bg-deep-700/50 bg-deep-700/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-white">{preset.chinese_text}</span>
                          <span className="text-xs text-deep-600 ml-3">→ {preset.english_text}</span>
                        </div>
                        <span className="text-xs text-emerald">{exists ? '已添加' : '+ 添加'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-deep-600 mb-1 block">中文</label>
                  <input
                    value={newChinese}
                    onChange={e => setNewChinese(e.target.value)}
                    className="input-field"
                    placeholder="输入中文短语"
                  />
                </div>
                <div>
                  <label className="text-sm text-deep-600 mb-1 block">英文</label>
                  <input
                    value={newEnglish}
                    onChange={e => setNewEnglish(e.target.value)}
                    className="input-field"
                    placeholder="输入英文翻译"
                  />
                </div>
                <div>
                  <label className="text-sm text-deep-600 mb-1 block">分类</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="input-field"
                  >
                    <option value="custom">自定义</option>
                    <option value="greeting">问候</option>
                    <option value="travel">旅行</option>
                    <option value="emergency">紧急</option>
                  </select>
                </div>
                <button
                  onClick={handleAddCustom}
                  disabled={!newChinese.trim() || !newEnglish.trim()}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 w-full py-2 rounded-xl text-sm text-deep-600 hover:text-white transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
