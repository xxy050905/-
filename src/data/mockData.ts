import type { User, TranslationRecord } from '@/types'

export const mockUser: User = {
  id: 'user_001',
  username: '演示用户',
  email: 'demo@example.com',
  createdAt: '2024-01-15T08:00:00Z',
  preferences: {
    defaultSpeed: 'normal',
    defaultVoice: 'female_us',
  },
}

const chineseTexts = [
  '你好，世界！这是一个语音翻译系统的演示。',
  '今天天气很好，我想去公园散步。',
  '人工智能正在改变我们的生活方式。',
  '欢迎来到语音翻译平台，体验高效便捷的翻译服务。',
  '机器学习是人工智能的一个重要分支，它让计算机能够从数据中学习。',
  '语音识别技术已经取得了很大的进步，准确率越来越高。',
  '这个系统支持多种语速和音色的选择。',
  '深度学习模型需要大量的数据进行训练。',
  '自然语言处理是计算机科学和人工智能的交叉领域。',
  '跨境电子商务正在蓬勃发展，翻译技术起着关键作用。',
]

const englishTexts = [
  'Hello, world! This is a demo of the voice translation system.',
  'The weather is nice today, I want to go for a walk in the park.',
  'Artificial intelligence is changing our way of life.',
  'Welcome to the voice translation platform, experience efficient and convenient translation services.',
  'Machine learning is an important branch of artificial intelligence that allows computers to learn from data.',
  'Speech recognition technology has made great progress with increasing accuracy.',
  'This system supports multiple speed and voice options.',
  'Deep learning models require large amounts of data for training.',
  'Natural language processing is an interdisciplinary field of computer science and artificial intelligence.',
  'Cross-border e-commerce is booming, with translation technology playing a key role.',
]

export const mockTranslationRecords: TranslationRecord[] = Array.from({ length: 20 }, (_, i) => ({
  id: `rec_${i + 1}`,
  chineseText: chineseTexts[i % chineseTexts.length],
  englishText: englishTexts[i % englishTexts.length],
  duration: 2 + Math.random() * 5,
  createdAt: new Date(Date.now() - i * 3600000 * (1 + Math.random())).toISOString(),
  status: 'completed',
  speed: ['slow', 'normal', 'fast'][i % 3],
  voice: ['female_us', 'male_us', 'female_uk'][i % 3],
}))

export const mockDailyTrend = Array.from({ length: 14 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - 13 + i)
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    count: Math.floor(20 + Math.random() * 80),
  }
})

export const mockLanguageDist = [
  { name: '中文→英文', value: 65 },
  { name: '英文→中文', value: 20 },
  { name: '中文→日文', value: 8 },
  { name: '其他', value: 7 },
]

export const mockHourlyUsage = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  count: Math.floor(Math.max(0, 30 * Math.sin((i - 6) * Math.PI / 12) + 30 + Math.random() * 20)),
}))
