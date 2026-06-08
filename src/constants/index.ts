// App version
export const APP_VERSION = 'v1.0.0'

// Voice options
export interface VoiceOption {
  id: string
  name: string
  emoji: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'female_us', name: '女声（美式）', emoji: '👩' },
  { id: 'male_us', name: '男声（美式）', emoji: '👨' },
  { id: 'female_uk', name: '女声（英式）', emoji: '👩‍🦰' },
]

// Speed options with display values
export interface SpeedOption {
  id: 'slow' | 'normal' | 'fast'
  name: string
  value: string
}

export const SPEED_OPTIONS: SpeedOption[] = [
  { id: 'slow', name: '慢速', value: '0.7x' },
  { id: 'normal', name: '正常', value: '1.0x' },
  { id: 'fast', name: '快速', value: '1.3x' },
]

// Speed value mapping for speech synthesis
export const SPEED_RATE_MAP: Record<string, number> = { slow: 0.7, normal: 1.0, fast: 1.3 }

// File upload limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ACCEPTED_AUDIO_EXTENSIONS = /\.(wav|mp3|m4a|ogg|webm|flac)$/i

// Chart colors
export const CHART_COLORS = ['#10B981', '#F59E0B', '#8B5CF6']

// Default recording sample rate
export const RECORDING_SAMPLE_RATE = 16000

// Voice config for browser speech synthesis matching
export const VOICE_CONFIG: Record<string, { genderKeywords: string[]; localeKeywords: string[] }> = {
  female_us: {
    genderKeywords: ['female', 'woman', 'samantha', 'zira', 'hazel', 'susan'],
    localeKeywords: ['en-US', 'en_US'],
  },
  male_us: {
    genderKeywords: ['male', 'man', 'david', 'mark', 'daniel'],
    localeKeywords: ['en-US', 'en_US'],
  },
  female_uk: {
    genderKeywords: ['female', 'woman', 'samantha', 'karen', 'serena'],
    localeKeywords: ['en-GB', 'en_GB', 'UK'],
  },
}
