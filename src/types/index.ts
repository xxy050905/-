// 用户数据
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  preferences: {
    defaultSpeed: 'slow' | 'normal' | 'fast';
    defaultVoice: string;
  };
}

// Raw user response from API (snake_case)
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  created_at: string;
  default_speed?: string;
  default_voice?: string;
}

// 翻译记录 (camelCase for frontend usage)
export interface TranslationRecord {
  id: string;
  chineseText: string;
  englishText: string;
  duration: number;
  createdAt: string;
  status: 'completed' | 'failed' | 'processing';
  speed?: string;
  voice?: string;
}

// 翻译记录 API 响应 (snake_case)
export interface TranslationRecordResponse {
  id: string;
  chinese_text: string;
  english_text: string;
  duration?: number;
  created_at: string;
  status?: 'completed' | 'failed' | 'processing';
  speed?: string;
  voice?: string;
  input_audio_path?: string;
  output_audio_path?: string;
}

// 系统统计
export interface SystemStats {
  totalTranslations: number;
  todayTranslations: number;
  successRate: number;
  avgDuration: number;
  dailyTrend: { date: string; count: number }[];
  languageDist: { name: string; value: number }[];
  hourlyUsage: { hour: string; count: number }[];
}

export interface Phrase {
  id: string;
  chineseText: string;
  englishText: string;
  category: string;
  createdAt: string;
}

export interface PhraseResponse {
  id: string;
  user_id: string;
  chinese_text: string;
  english_text: string;
  category: string;
  created_at: string;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  translation: string;
  phonetic?: string;
  audioUrl?: string;
  createdAt: string;
}

export interface DictionaryEntryResponse {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  phonetic?: string;
  audio_url?: string;
  created_at: string;
}

/**
 * Transform API user response to frontend User interface
 */
export function mapUserResponseToUser(data: UserResponse): User {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    createdAt: data.created_at,
    preferences: {
      defaultSpeed: (data.default_speed as 'slow' | 'normal' | 'fast') || 'normal',
      defaultVoice: data.default_voice || 'female_us',
    },
  }
}

/**
 * Transform API translation record to frontend format
 */
export function mapTranslationRecordResponse(record: TranslationRecordResponse): TranslationRecord {
  return {
    id: record.id,
    chineseText: record.chinese_text,
    englishText: record.english_text,
    duration: record.duration ?? 0,
    createdAt: record.created_at,
    status: record.status ?? 'completed',
    speed: record.speed,
    voice: record.voice,
  }
}
