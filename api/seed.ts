import { stmts } from './db'
import { v4 as uuidv4 } from 'uuid'

export function seedDatabase(userId: string) {
  // Check if already has data
  const count = stmts.getTranslationCount.get(userId) as { count: number }
  if (count.count > 5) return

  const records = [
    { cn: '你好，世界！这是一个语音翻译系统的演示。', en: 'Hello, world! This is a demo of the voice translation system.', hours: -2 },
    { cn: '今天天气很好，我想去公园散步。', en: 'The weather is nice today, I want to go for a walk in the park.', hours: -5 },
    { cn: '人工智能正在改变我们的生活方式。', en: 'Artificial intelligence is changing our way of life.', hours: -8 },
    { cn: '欢迎来到语音翻译平台，体验高效便捷的翻译服务。', en: 'Welcome to the voice translation platform, experience efficient and convenient translation services.', hours: -14 },
    { cn: '机器学习是人工智能的一个重要分支，它让计算机能够从数据中学习。', en: 'Machine learning is an important branch of artificial intelligence that allows computers to learn from data.', hours: -20 },
    { cn: '语音识别技术已经取得了很大的进步，准确率越来越高。', en: 'Speech recognition technology has made great progress with increasing accuracy.', hours: -26 },
    { cn: '这个系统支持多种语速和音色的选择。', en: 'This system supports multiple speed and voice options.', hours: -30 },
    { cn: '深度学习模型需要大量的数据进行训练。', en: 'Deep learning models require large amounts of data for training.', hours: -36 },
    { cn: '自然语言处理是计算机科学和人工智能的交叉领域。', en: 'Natural language processing is an interdisciplinary field of computer science and artificial intelligence.', hours: -42 },
    { cn: '跨境电子商务正在蓬勃发展，翻译技术起着关键作用。', en: 'Cross-border e-commerce is booming, with translation technology playing a key role.', hours: -48 },
    { cn: '语音合成技术可以让计算机生成自然流畅的人声。', en: 'Speech synthesis technology allows computers to generate natural and fluent human voice.', hours: -52 },
    { cn: '端点检测算法可以准确地识别语音信号的起止位置。', en: 'Endpoint detection algorithms can accurately identify the start and end positions of speech signals.', hours: -58 },
    { cn: '梅尔频率倒谱系数是语音识别中常用的特征。', en: 'Mel-frequency cepstral coefficients are commonly used features in speech recognition.', hours: -65 },
    { cn: 'Transformer架构在机器翻译任务中表现出色。', en: 'The Transformer architecture performs exceptionally well in machine translation tasks.', hours: -72 },
    { cn: '多语言翻译模型可以同时处理多种语言对的翻译。', en: 'Multilingual translation models can handle translation for multiple language pairs simultaneously.', hours: -80 },
    { cn: '语音翻译系统在跨语言交流中发挥着重要作用。', en: 'Speech translation systems play an important role in cross-language communication.', hours: -90 },
    { cn: '预加重和分帧是语音信号处理的基本步骤。', en: 'Pre-emphasis and framing are basic steps in speech signal processing.', hours: -100 },
    { cn: '离散余弦变换用于提取MFCC特征的关键步骤。', en: 'Discrete cosine transform is a key step in extracting MFCC features.', hours: -110 },
    { cn: 'Whisper模型支持多种语言的语音识别。', en: 'The Whisper model supports speech recognition in multiple languages.', hours: -130 },
    { cn: '实时语音翻译技术正在不断进步和完善。', en: 'Real-time speech translation technology is constantly improving and evolving.', hours: -150 },
    { cn: '音色控制可以让合成语音更加自然和个性化。', en: 'Voice control can make synthesized speech more natural and personalized.', hours: -180 },
    { cn: '语音翻译的未来将更加智能化和便捷化。', en: 'The future of speech translation will be more intelligent and convenient.', hours: -220 },
    { cn: '神经网络模型在语音识别领域取得了突破性进展。', en: 'Neural network models have achieved breakthrough progress in speech recognition.', hours: -280 },
    { cn: '多模态学习结合了语音、文本和视觉信息。', en: 'Multimodal learning combines speech, text, and visual information.', hours: -320 },
  ]

  const speeds = ['slow', 'normal', 'fast']
  const voices = ['female_us', 'male_us', 'female_uk']

  for (const r of records) {
    const id = uuidv4()
    const createdAt = new Date(Date.now() + r.hours * 3600000).toISOString().replace('T', ' ').substring(0, 19)
    stmts.insertSeedData.run(
      id,
      userId,
      r.cn,
      r.en,
      2 + Math.random() * 5,
      speeds[Math.floor(Math.random() * 3)],
      voices[Math.floor(Math.random() * 3)],
      'completed',
      createdAt
    )
  }

  console.log(`Seeded ${records.length} translation records for user ${userId}`)
}
