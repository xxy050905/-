// API client for backend communication
const API_BASE = '/api'

function getHeaders(): HeadersInit {
  const userId = localStorage.getItem('user_id')
  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
  }
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    localStorage.setItem('user_id', data.user.id)
    return data
  },

  register: async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    localStorage.setItem('user_id', data.user.id)
    return data
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/user/profile`, { headers: getHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },

  updateProfile: async (data: Record<string, string | undefined>) => {
    const res = await fetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error)
    return result
  },
}

// Speech Processing API (Python FastAPI)
export const speechApi = {
  // Endpoint detection
  detectEndpoint: async (audioFile: File) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    const res = await fetch(`${API_BASE}/speech/detect-endpoint`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Preprocessing & MFCC extraction
  preprocess: async (audioFile: File) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    const res = await fetch(`${API_BASE}/speech/preprocess`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Speech recognition (audio -> text)
  recognize: async (audioFile: File, language: string = 'zh') => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('language', language)
    const res = await fetch(`${API_BASE}/speech/recognize`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Speech synthesis (text -> audio)
  synthesize: async (text: string, voice: string = 'female_us', speed: string = 'normal') => {
    console.log('[API] synthesize called with voice:', voice, 'speed:', speed)
    const res = await fetch(`${API_BASE}/speech/synthesize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, voice, speed }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Full pipeline: audio -> recognize -> translate -> synthesize
  fullPipeline: async (
    audioFile: File,
    voice: string = 'female_us',
    speed: string = 'normal',
    language: string = 'zh'
  ) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('voice', voice)
    formData.append('speed', speed)
    formData.append('language', language)
    const res = await fetch(`${API_BASE}/speech/pipeline`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Health check
  healthCheck: async () => {
    const res = await fetch(`${API_BASE}/health`)
    const data = await res.json()
    return data
  },

  // Get voice config
  getVoiceConfig: async () => {
    const res = await fetch(`${API_BASE}/config/voices`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Upload audio only
  uploadAudio: async (audioFile: File) => {
    const formData = new FormData()
    formData.append('audio', audioFile)
    const res = await fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },
}

// Translation API
export const translationApi = {
  // Text translation (via Python API)
  translate: async (text: string) => {
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  // Create translation record (via Express for DB storage)
  create: async (data: {
    chinese_text: string
    english_text: string
    duration?: number
    speed?: string
    voice?: string
  }) => {
    const res = await fetch(`${API_BASE}/translations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error)
    return result
  },

  list: async (limit = 20, offset = 0) => {
    const res = await fetch(`${API_BASE}/translations?limit=${limit}&offset=${offset}`, {
      headers: getHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/translations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },
}

// History API (via Python API)
export const historyApi = {
  save: async (data: {
    user_id: string
    chinese_text: string
    english_text: string
    duration?: number
    speed?: string
    voice?: string
    status?: string
  }) => {
    const formData = new FormData()
    formData.append('user_id', data.user_id)
    formData.append('chinese_text', data.chinese_text)
    formData.append('english_text', data.english_text)
    formData.append('duration', String(data.duration || 0))
    formData.append('speed', data.speed || 'normal')
    formData.append('voice', data.voice || 'female_us')
    formData.append('status', data.status || 'completed')

    const res = await fetch(`${API_BASE}/history`, {
      method: 'POST',
      body: formData,
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.detail || result.error)
    return result
  },

  list: async (userId: string, limit = 20, offset = 0) => {
    const res = await fetch(`${API_BASE}/history?user_id=${userId}&limit=${limit}&offset=${offset}`, {
      headers: getHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },

  delete: async (recordId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/history/${recordId}?user_id=${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error)
    return data
  },
}

// Stats API
export const statsApi = {
  getStats: async () => {
    const res = await fetch(`${API_BASE}/stats`, { headers: getHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },
}

// Phrases API
export const phrasesApi = {
  list: async () => {
    const res = await fetch(`${API_BASE}/phrases`, { headers: getHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },

  create: async (data: { chinese_text: string; english_text: string; category?: string }) => {
    const res = await fetch(`${API_BASE}/phrases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error)
    return result
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/phrases/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },
}

// Dictionary API
export const dictionaryApi = {
  list: async (search?: string) => {
    const url = search
      ? `${API_BASE}/dictionary?search=${encodeURIComponent(search)}`
      : `${API_BASE}/dictionary`
    const res = await fetch(url, { headers: getHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },

  create: async (data: { word: string; translation: string; phonetic?: string }) => {
    const res = await fetch(`${API_BASE}/dictionary`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error)
    return result
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/dictionary/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },
}
