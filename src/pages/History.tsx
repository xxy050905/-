import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Search, Trash2, Copy, Calendar, Loader2 } from 'lucide-react'

export default function History() {
  const records = useAppStore((s) => s.translationRecords)
  const deleteTranslation = useAppStore((s) => s.deleteTranslation)
  const loadTranslations = useAppStore((s) => s.loadTranslations)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadTranslations(100, 0)
  }, [loadTranslations])

  const filteredRecords = records.filter((r) => {
    const matchSearch =
      !searchQuery ||
      r.chineseText.includes(searchQuery) ||
      r.englishText.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDelete = async (id: string) => {
    await deleteTranslation(id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white">历史记录</h1>
        <p className="text-deep-600 mt-2">查看和管理您的翻译历史</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索翻译内容..."
            className="input-field pl-10"
            aria-label="搜索翻译记录"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm transition-all duration-200 whitespace-nowrap
                ${statusFilter === status
                  ? 'bg-emerald/20 text-emerald border border-emerald/30'
                  : 'bg-deep-700/30 text-deep-600 border border-transparent hover:bg-deep-700/50'
                }`}
            >
              {status === 'all' ? '全部' : status === 'completed' ? '成功' : '失败'}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {records.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-deep-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          加载中...
        </div>
      ) : (
        <p className="text-sm text-deep-600">共 {filteredRecords.length} 条记录</p>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {filteredRecords.length === 0 && records.length > 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-12 h-12 text-deep-600 mx-auto mb-4" />
            <p className="text-deep-600">没有匹配的翻译记录</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar className="w-12 h-12 text-deep-600 mx-auto mb-4" />
            <p className="text-deep-600">暂无翻译记录</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div
              key={record.id}
              className="glass-card p-5 group hover:border-deep-600/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    record.status === 'completed' ? 'bg-emerald' : 'bg-rose'
                  }`} />
                  <span className="text-xs text-deep-600">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-xs text-deep-600">· {record.duration?.toFixed(1)}s</span>
                  {record.speed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-deep-700/40 text-deep-600">
                      {record.speed === 'slow' ? '慢速' : record.speed === 'fast' ? '快速' : '正常'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(record.chineseText + '\n' + record.englishText)}
                    className="p-1.5 rounded-lg hover:bg-deep-700/50 transition-colors text-deep-600 hover:text-white"
                    aria-label="复制"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-1.5 rounded-lg hover:bg-rose/10 transition-colors text-deep-600 hover:text-rose"
                    aria-label="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-deep-900/50 p-4">
                  <p className="text-xs text-deep-600 mb-1">中文</p>
                  <p className="text-sm text-white leading-relaxed">{record.chineseText}</p>
                </div>
                <div className="rounded-xl bg-deep-900/50 p-4">
                  <p className="text-xs text-deep-600 mb-1">英文</p>
                  <p className="text-sm text-white leading-relaxed">{record.englishText}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
