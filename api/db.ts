import initSqlJs, { Database, SqlValue } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, '..', 'data.db')

// Initialize the database
const SQL = await initSqlJs()

// Load existing database or create new one
let dbBuffer: Uint8Array | undefined
if (fs.existsSync(dbPath)) {
  dbBuffer = fs.readFileSync(dbPath)
}

const db = new SQL.Database(dbBuffer)

// Enable WAL mode (not supported in sql.js, skip)

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    default_speed TEXT DEFAULT 'normal',
    default_voice TEXT DEFAULT 'female_us'
  );
`)

db.run(`
  CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chinese_text TEXT NOT NULL,
    english_text NOT NULL,
    input_audio_path TEXT,
    output_audio_path TEXT,
    duration REAL DEFAULT 0,
    speed TEXT DEFAULT 'normal',
    voice TEXT DEFAULT 'female_us',
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

db.run('CREATE INDEX IF NOT EXISTS idx_translations_user ON translations(user_id);')
db.run('CREATE INDEX IF NOT EXISTS idx_translations_created ON translations(created_at);')

db.run(`
  CREATE TABLE IF NOT EXISTS phrases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chinese_text TEXT NOT NULL,
    english_text TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

db.run('CREATE INDEX IF NOT EXISTS idx_phrases_user ON phrases(user_id);')

db.run(`
  CREATE TABLE IF NOT EXISTS dictionary (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    phonetic TEXT,
    audio_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

db.run('CREATE INDEX IF NOT EXISTS idx_dictionary_user ON dictionary(user_id);')
db.run('CREATE INDEX IF NOT EXISTS idx_dictionary_word ON dictionary(word);')

// Helper function to save database to disk
function saveDb() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

// Save on every write operation
const origRun = db.run.bind(db)
db.run = function(sql: string, params?: SqlValue[]) {
  const result = origRun(sql, params)
  // Save after INSERT, UPDATE, DELETE
  if (/^(INSERT|UPDATE|DELETE)/i.test(sql.trim())) {
    saveDb()
  }
  return result
}

// Prepared statement wrapper
class PreparedStatement {
  private sql: string

  constructor(sql: string) {
    this.sql = sql
  }

  get(...params: SqlValue[]): Record<string, SqlValue> | undefined {
    const results = db.exec(this.sql, params)
    if (results.length === 0 || results[0].values.length === 0) return undefined
    const columns = results[0].columns
    const row = results[0].values[0]
    const obj: Record<string, SqlValue> = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  }

  all(...params: SqlValue[]): Record<string, SqlValue>[] {
    const results = db.exec(this.sql, params)
    if (results.length === 0) return []
    const columns = results[0].columns
    return results[0].values.map((row) => {
      const obj: Record<string, SqlValue> = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj
    })
  }

  run(...params: SqlValue[]): { changes: number } {
    db.run(this.sql, params)
    // Get changes count
    const result = db.exec('SELECT changes() as changes')
    const changes = result[0]?.values[0]?.[0] as number || 0
    return { changes }
  }
}

// Prepare statements
const stmts = {
  // Users
  createUser: new PreparedStatement(`
    INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)
  `),
  getUserByEmail: new PreparedStatement('SELECT * FROM users WHERE email = ?'),
  getUserById: new PreparedStatement('SELECT id, username, email, avatar, created_at, default_speed, default_voice FROM users WHERE id = ?'),
  updateUser: new PreparedStatement('UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), default_speed = COALESCE(?, default_speed), default_voice = COALESCE(?, default_voice) WHERE id = ?'),

  // Translations
  createTranslation: new PreparedStatement(`
    INSERT INTO translations (id, user_id, chinese_text, english_text, input_audio_path, output_audio_path, duration, speed, voice, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getTranslationsByUser: new PreparedStatement('SELECT * FROM translations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'),
  getTranslationById: new PreparedStatement('SELECT * FROM translations WHERE id = ?'),
  deleteTranslation: new PreparedStatement('DELETE FROM translations WHERE id = ? AND user_id = ?'),
  getTranslationCount: new PreparedStatement('SELECT COUNT(*) as count FROM translations WHERE user_id = ?'),
  getTodayCount: new PreparedStatement("SELECT COUNT(*) as count FROM translations WHERE user_id = ? AND date(created_at) = date('now')"),
  getSuccessRate: new PreparedStatement("SELECT CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as rate FROM translations WHERE user_id = ?"),
  getAvgDuration: new PreparedStatement('SELECT AVG(duration) as avg_duration FROM translations WHERE user_id = ?'),
  getDailyTrend: new PreparedStatement(`
    SELECT date(created_at) as date, COUNT(*) as count 
    FROM translations 
    WHERE user_id = ? AND created_at >= datetime('now', '-13 days')
    GROUP BY date(created_at) ORDER BY date ASC
  `),
  getHourlyUsage: new PreparedStatement(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM translations
    WHERE user_id = ? AND created_at >= datetime('now', '-1 day')
    GROUP BY hour ORDER BY hour ASC
  `),
  getTotalCount: new PreparedStatement('SELECT COUNT(*) as count FROM translations'),
  insertSeedData: new PreparedStatement(`
    INSERT OR IGNORE INTO translations (id, user_id, chinese_text, english_text, duration, speed, voice, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // Phrases
  createPhrase: new PreparedStatement(`
    INSERT INTO phrases (id, user_id, chinese_text, english_text, category) VALUES (?, ?, ?, ?, ?)
  `),
  getPhrasesByUser: new PreparedStatement('SELECT * FROM phrases WHERE user_id = ? ORDER BY created_at DESC'),
  deletePhrase: new PreparedStatement('DELETE FROM phrases WHERE id = ? AND user_id = ?'),

  // Dictionary
  createDictionaryEntry: new PreparedStatement(`
    INSERT INTO dictionary (id, user_id, word, translation, phonetic) VALUES (?, ?, ?, ?, ?)
  `),
  getDictionaryByUser: new PreparedStatement('SELECT * FROM dictionary WHERE user_id = ? ORDER BY word ASC'),
  searchDictionary: new PreparedStatement("SELECT * FROM dictionary WHERE user_id = ? AND word LIKE '%' || ? || '%' ORDER BY word ASC"),
  deleteDictionaryEntry: new PreparedStatement('DELETE FROM dictionary WHERE id = ? AND user_id = ?'),
}

export { db, stmts, saveDb }
