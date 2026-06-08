import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { db, stmts } from './db'
import { seedDatabase } from './seed'

const app = express()
const PORT = 3001

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads')
const audioDir = path.join(uploadsDir, 'audio')
fs.mkdirSync(audioDir, { recursive: true })

// Multer config for audio uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, audioDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|webm|flac)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only audio files are allowed'))
    }
  },
})

// Auth middleware (simple session via header)
const getUserFromReq = (req: express.Request) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) return null
  return stmts.getUserById.get(userId) as { id: string; username: string; email: string; default_speed: string; default_voice: string } | undefined
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const existing = stmts.getUserByEmail.get(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const id = uuidv4()
    stmts.createUser.run(id, username, email, password)
    seedDatabase(id)

    const user = stmts.getUserById.get(id)
    res.json({ user, message: 'Registration successful' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body
    const user = stmts.getUserByEmail.get(email) as any

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { password: _p, ...userData } = user
    res.json({ user: userData, message: 'Login successful' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get user profile
app.get('/api/user/profile', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ user })
})

// Update user profile
app.put('/api/user/profile', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { username, email, default_speed, default_voice } = req.body
  stmts.updateUser.run(username || null, email || null, default_speed || null, default_voice || null, user.id)

  const updated = stmts.getUserById.get(user.id)
  res.json({ user: updated })
})

// ==================== TRANSLATION ROUTES ====================

// Create translation record
app.post('/api/translations', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { chinese_text, english_text, duration, speed, voice, input_audio_path, output_audio_path } = req.body
  if (!chinese_text || !english_text) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const id = uuidv4()
  stmts.createTranslation.run(
    id, user.id, chinese_text, english_text,
    input_audio_path || null, output_audio_path || null,
    duration || 0, speed || 'normal', voice || 'female_us', 'completed'
  )

  const record = stmts.getTranslationById.get(id)
  res.json({ translation: record })
})

// Upload audio file
app.post('/api/upload/audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  res.json({
    file_path: `/uploads/audio/${req.file.filename}`,
    file_name: req.file.originalname,
    file_size: req.file.size,
    message: 'Audio uploaded successfully',
  })
})

// Get translations list (with pagination)
app.get('/api/translations', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const limit = parseInt(req.query.limit as string) || 20
  const offset = parseInt(req.query.offset as string) || 0

  const records = stmts.getTranslationsByUser.all(user.id, limit, offset)
  const total = (stmts.getTranslationCount.get(user.id) as any).count

  res.json({ translations: records, total })
})

// Get single translation
app.get('/api/translations/:id', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const record = stmts.getTranslationById.get(req.params.id)
  if (!record) return res.status(404).json({ error: 'Not found' })

  res.json({ translation: record })
})

// Delete translation
app.delete('/api/translations/:id', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const result = stmts.deleteTranslation.run(req.params.id, user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })

  res.json({ message: 'Deleted successfully' })
})

// ==================== STATS ROUTES ====================

app.get('/api/stats', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const total = (stmts.getTranslationCount.get(user.id) as any).count
  const today = (stmts.getTodayCount.get(user.id) as any).count
  const successRateRow = stmts.getSuccessRate.get(user.id) as any
  const avgDurationRow = stmts.getAvgDuration.get(user.id) as any

  // Daily trend (last 14 days)
  const dailyRows = stmts.getDailyTrend.all(user.id) as any[]
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 13 + i)
    const dateStr = d.toISOString().split('T')[0]
    const row = dailyRows.find((r) => r.date === dateStr)
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      count: row ? row.count : 0,
    }
  })

  // Hourly usage (last 24h)
  const hourlyRows = stmts.getHourlyUsage.all(user.id) as any[]
  const hourlyMap = new Map(hourlyRows.map((r) => [r.hour, r.count]))
  const hourlyUsage = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    count: hourlyMap.get(i) || 0,
  }))

  // Language distribution from existing records
  const allRecords = stmts.getTranslationsByUser.all(user.id, 100, 0) as any[]
  const langMap: Record<string, number> = {}
  for (const r of allRecords) {
    const key = r.speed === 'fast' ? 'fast' : r.speed === 'slow' ? 'slow' : 'normal'
    langMap[key] = (langMap[key] || 0) + 1
  }
  const totalForDist = Object.values(langMap).reduce((a, b) => a + b, 0) || 1
  const languageDist = [
    { name: '正常语速', value: Math.round((langMap.normal || 0) / totalForDist * 100) },
    { name: '快速语速', value: Math.round((langMap.fast || 0) / totalForDist * 100) },
    { name: '慢速语速', value: Math.round((langMap.slow || 0) / totalForDist * 100) },
  ]

  res.json({
    stats: {
      totalTranslations: total,
      todayTranslations: today,
      successRate: successRateRow?.rate ? parseFloat(successRateRow.rate).toFixed(1) : '100.0',
      avgDuration: avgDurationRow?.avg_duration ? parseFloat(avgDurationRow.avg_duration).toFixed(1) : '0.0',
      dailyTrend,
      languageDist,
      hourlyUsage,
    },
  })
})

// ==================== PHRASE ROUTES ====================

// Get all phrases
app.get('/api/phrases', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const phrases = stmts.getPhrasesByUser.all(user.id)
  res.json({ phrases })
})

// Create phrase
app.post('/api/phrases', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { chinese_text, english_text, category } = req.body
  if (!chinese_text || !english_text) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const id = uuidv4()
  stmts.createPhrase.run(id, user.id, chinese_text, english_text, category || 'custom')

  const phrase = stmts.getPhrasesByUser.all(user.id).find(p => p.id === id)
  res.json({ phrase, message: 'Phrase created' })
})

// Delete phrase
app.delete('/api/phrases/:id', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const result = stmts.deletePhrase.run(req.params.id, user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })

  res.json({ message: 'Deleted successfully' })
})

// ==================== DICTIONARY ROUTES ====================

// Get dictionary entries
app.get('/api/dictionary', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const search = req.query.search as string
  const entries = search
    ? stmts.searchDictionary.all(user.id, search)
    : stmts.getDictionaryByUser.all(user.id)

  res.json({ entries })
})

// Create dictionary entry
app.post('/api/dictionary', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { word, translation, phonetic } = req.body
  if (!word || !translation) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const id = uuidv4()
  stmts.createDictionaryEntry.run(id, user.id, word, translation, phonetic || null)

  const entry = stmts.getDictionaryByUser.all(user.id).find(e => e.id === id)
  res.json({ entry, message: 'Dictionary entry created' })
})

// Delete dictionary entry
app.delete('/api/dictionary/:id', (req, res) => {
  const user = getUserFromReq(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const result = stmts.deleteDictionaryEntry.run(req.params.id, user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })

  res.json({ message: 'Deleted successfully' })
})

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📁 Uploads directory: ${audioDir}`)
  console.log(`💾 Database: ${path.join(process.cwd(), 'data.db')}\n`)
})
