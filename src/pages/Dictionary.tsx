import { useState, useEffect } from 'react'
import { dictionaryApi, speechApi } from '@/api/client'
import type { DictionaryEntry, DictionaryEntryResponse } from '@/types'
import { Plus, Trash2, Play, Loader2, XCircle, Search, BookOpen } from 'lucide-react'

function mapEntryResponse(r: DictionaryEntryResponse): DictionaryEntry {
  return {
    id: r.id,
    word: r.word,
    translation: r.translation,
    phonetic: r.phonetic,
    audioUrl: r.audio_url,
    createdAt: r.created_at,
  }
}

export default function Dictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newPhonetic, setNewPhonetic] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    try {
      const data = await dictionaryApi.list()
      setEntries(data.entries.map(mapEntryResponse))
    } catch (err: any) {
      setErrorMessage(`加载失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchText.trim()) {
      loadEntries()
      return
    }
    try {
      const data = await dictionaryApi.list(searchText.trim())
      setEntries(data.entries.map(mapEntryResponse))
    } catch (err: any) {
      setErrorMessage(`搜索失败: ${err.message}`)
    }
  }

  const handleAdd = async () => {
    if (!newWord.trim() || !newTranslation.trim()) return
    try {
      const data = await dictionaryApi.create({
        word: newWord.trim(),
        translation: newTranslation.trim(),
        phonetic: newPhonetic.trim() || undefined,
      })
      setEntries(prev => [...prev, mapEntryResponse(data.entry)])
      setNewWord('')
      setNewTranslation('')
      setNewPhonetic('')
      setShowAddModal(false)
    } catch (err: any) {
      setErrorMessage(`添加失败: ${err.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await dictionaryApi.delete(id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      setErrorMessage(`删除失败: ${err.message}`)
    }
  }

  const handlePlay = async (entry: DictionaryEntry) => {
    if (playingId === entry.id) {
      setPlayingId(null)
      return
    }
    setPlayingId(entry.id)
    try {
      const result = await speechApi.synthesize(entry.word)
      const audio = new Audio(result.audio_url.startsWith('/') ? `http://localhost:8001${result.audio_url}` : result.audio_url)
      audio.onended = () => setPlayingId(null)
      audio.onerror = () => setPlayingId(null)
      audio.play()
    } catch {
      setPlayingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">语音词典</h1>
          <p className="text-deep-600 mt-2">查询词汇翻译，一键播放发音</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          添加词汇
        </button>
      </div>

      {/* Search bar */}
      <div className="glass-card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="input-field pl-10"
              placeholder="搜索单词或短语..."
            />
          </div>
          <button onClick={handleSearch} className="btn-secondary">搜索</button>
          {searchText && (
            <button onClick={() => { setSearchText(''); loadEntries() }} className="btn-secondary">清除</button>
          )}
        </div>
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
          {/* Entries list */}
          {entries.length > 0 ? (
            <div className="glass-card">
              <div className="divide-y divide-deep-700/30">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center gap-4 group hover:bg-deep-700/20 transition-colors">
                    {/* Word */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{entry.word}</span>
                        {entry.phonetic && (
                          <span className="text-xs text-deep-600 font-mono">/{entry.phonetic}/</span>
                        )}
                      </div>
                      <p className="text-sm text-deep-600 mt-1">{entry.translation}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePlay(entry)}
                        className={`p-1.5 rounded-lg transition-colors ${playingId === entry.id ? 'bg-emerald text-white' : 'hover:bg-deep-700/50 text-deep-600 hover:text-white'}`}
                        aria-label="播放发音"
                      >
                        {playingId === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-rose/20 text-deep-600 hover:text-rose transition-colors"
                        aria-label="删除词汇"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <BookOpen className="w-12 h-12 text-deep-700 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">{searchText ? '未找到匹配的词汇' : '暂无词汇'}</p>
              <p className="text-sm text-deep-600 mb-6">
                {searchText ? '尝试其他搜索词' : '添加词汇，方便快速查询和发音'}
              </p>
              {!searchText && (
                <button onClick={() => setShowAddModal(true)} className="btn-primary">
                  添加第一个词汇
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-heading font-bold text-white mb-6">添加词汇</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-deep-600 mb-1 block">单词 / 短语</label>
                <input
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  className="input-field"
                  placeholder="输入英文单词"
                />
              </div>
              <div>
                <label className="text-sm text-deep-600 mb-1 block">翻译</label>
                <input
                  value={newTranslation}
                  onChange={e => setNewTranslation(e.target.value)}
                  className="input-field"
                  placeholder="输入中文翻译"
                />
              </div>
              <div>
                <label className="text-sm text-deep-600 mb-1 block">音标（可选）</label>
                <input
                  value={newPhonetic}
                  onChange={e => setNewPhonetic(e.target.value)}
                  className="input-field"
                  placeholder="例如：həˈloʊ"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!newWord.trim() || !newTranslation.trim()}
                className="btn-primary w-full disabled:opacity-50"
              >
                添加
              </button>
            </div>

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
