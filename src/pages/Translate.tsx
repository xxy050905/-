import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { speechApi, translationApi } from '@/api/client'
import { Mic, MicOff, Upload, Play, Pause, Copy, Download, Loader2, CheckCircle, XCircle, FileAudio } from 'lucide-react'
import {
  VOICE_OPTIONS,
  SPEED_OPTIONS,
  SPEED_RATE_MAP,
  MAX_FILE_SIZE,
  ACCEPTED_AUDIO_EXTENSIONS,
  RECORDING_SAMPLE_RATE,
  VOICE_CONFIG,
} from '@/constants'

// WAV encoder for browser audio - avoids ffmpeg dependency on backend
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // RIFF header
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + samples.length * 2, true)
  view.setUint32(8, 0x57415645, false) // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample

  // data chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, samples.length * 2, true)

  // samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

// Convert webm/ogg audio blob to WAV using AudioContext
async function blobToWav(audioBlob: Blob, targetSampleRate = RECORDING_SAMPLE_RATE): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: targetSampleRate })
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // Get mono channel at target sample rate
  const channelData = audioBuffer.getChannelData(0)
  await audioContext.close()

  return encodeWAV(channelData, targetSampleRate)
}

type ProcessStep = 'idle' | 'uploading' | 'detecting' | 'recognizing' | 'translating' | 'synthesizing' | 'done' | 'error'

// Declare SpeechRecognition types for browsers
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

// Get SpeechRecognition constructor (works in Chrome/Edge)
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

export default function Translate() {
  const { user, isRecording, setRecording, addTranslation, loadStats } = useAppStore()
  const [chineseText, setChineseText] = useState('')
  const [englishText, setEnglishText] = useState('')
  const [step, setStep] = useState<ProcessStep>('idle')
  const [selectedVoice, setSelectedVoice] = useState(user?.preferences?.defaultVoice || 'female_us')
  const [selectedSpeed, setSelectedSpeed] = useState<'slow' | 'normal' | 'fast'>(user?.preferences?.defaultSpeed || 'normal')

  // Log voice selection changes
  useEffect(() => {
    console.log('[VOICE-STATE] selectedVoice changed to:', selectedVoice)
  }, [selectedVoice])

  // Log speed selection changes
  useEffect(() => {
    console.log('[SPEED-STATE] selectedSpeed changed to:', selectedSpeed)
  }, [selectedSpeed])

  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('')
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [recordDuration, setRecordDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [interimText, setInterimText] = useState('')
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [apiError, setApiError] = useState(false)

  const animationRef = useRef<number>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const durationTimerRef = useRef<number>()
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Check Python API availability
  useEffect(() => {
    speechApi.healthCheck().then(
      () => setApiError(false),
      () => setApiError(true)
    )
  }, [])

  // Waveform animation during recording
  const animateWaveform = useCallback(() => {
    const generateData = () =>
      Array.from({ length: 64 }, () => Math.random() * 0.8 + 0.2)

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      const data = generateData()
      setWaveformData(data)

      const bars = data.length
      const barWidth = width / bars * 0.6
      const gap = width / bars * 0.4

      data.forEach((val, i) => {
        const barHeight = val * height * 0.8
        const x = i * (barWidth + gap) + gap / 2
        const y = (height - barHeight) / 2

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.9)')
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()
  }, [])

  // Cleanup animation
  useEffect(() => {
    if (!isRecording) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isRecording])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
    }
  }, [])

  // Load available speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      setAvailableVoices(voices)
    }
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
    return () => { speechSynthesis.cancel() }
  }, [])

  // Start recording: use SpeechRecognition for real-time STT display
  const startRecording = async () => {
    setErrorMessage('')
    setInterimText('')

    if (!SpeechRecognition) {
      setErrorMessage('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器')
      setStep('error')
      return
    }

    try {
      // Start MediaRecorder for waveform animation + audio blob for backend
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      mediaRecorder.start(100)
      mediaRecorderRef.current = mediaRecorder

      // Start SpeechRecognition for interim text display
      const recognition = new SpeechRecognition() as SpeechRecognitionInstance
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'zh-CN'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interim += transcript
          }
        }
        if (finalTranscript) {
          setChineseText((prev) => prev + finalTranscript)
        }
        setInterimText(interim)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setErrorMessage('无法访问麦克风，请检查浏览器权限设置')
        } else if (event.error === 'no-speech') {
          setErrorMessage('未检测到语音，请重试')
        }
        stopRecording()
        setStep('error')
      }

      recognition.onend = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try { recognition.start() } catch { /* already started */ }
        }
      }

      speechRecognitionRef.current = recognition
      recognition.start()

      setRecording(true)
      setRecordDuration(0)

      durationTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1)
      }, 1000)

      animateWaveform()
    } catch (err) {
      console.error('Recording failed:', err)
      setErrorMessage('无法访问麦克风，请检查浏览器权限设置')
      setStep('error')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
      speechRecognitionRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    setRecording(false)
    setInterimText('')
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Save audio blob for later upload to backend
    setTimeout(async () => {
      if (audioChunksRef.current.length > 0) {
        const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        // Convert to WAV format (16kHz mono) for backend processing
        const wavBlob = await blobToWav(webmBlob, RECORDING_SAMPLE_RATE)
        // Auto process the recorded audio through the backend pipeline
        processRecognizedAudio(wavBlob)
      }
    }, 200)
  }

  // Shared handler to save translation and refresh stats
  const handleSaveTranslation = useCallback(async (
    chinese_text: string,
    english_text: string,
    duration: number,
    speed: string,
    voice: string
  ) => {
    if (user?.id) {
      addTranslation({ chinese_text, english_text, duration, speed, voice })
        .then(() => loadStats())
        .catch(console.error)
    }
  }, [user?.id, addTranslation, loadStats])

  // Process recorded audio: upload to backend, recognize, translate, synthesize
  const processRecognizedAudio = async (audioBlob: Blob) => {
    setStep('uploading')
    try {
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' })

      // Full pipeline: recognize -> translate -> synthesize
      setStep('recognizing')
      const pipelineResult = await speechApi.fullPipeline(audioFile, selectedVoice, selectedSpeed, 'zh')

      setChineseText(pipelineResult.recognized_text)
      setEnglishText(pipelineResult.translated_text)
      setGeneratedAudioUrl(pipelineResult.output_audio_url || '')
      setStep('done')

      // Save to history via Express backend
      handleSaveTranslation(
        pipelineResult.recognized_text,
        pipelineResult.translated_text,
        pipelineResult.total_time,
        selectedSpeed,
        selectedVoice
      )
    } catch (err: any) {
      console.error('Pipeline processing failed:', err)
      setErrorMessage(`处理失败: ${err.message || '未知错误'}`)
      setStep('error')
    }
  }

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage('')
    setUploadedFileName(file.name)
    setStep('uploading')

    if (!file.type.startsWith('audio/') && !ACCEPTED_AUDIO_EXTENSIONS.test(file.name)) {
      setErrorMessage('请上传音频文件（支持 WAV、MP3、M4A、OGG、WebM、FLAC）')
      setStep('error')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('文件大小不能超过50MB')
      setStep('error')
      return
    }

    // Send file through full pipeline
    processUploadedFile(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processUploadedFile = async (file: File) => {
    try {
      setStep('recognizing')
      // Convert any audio format to WAV (16kHz mono) for backend processing
      const wavBlob = await blobToWav(file, RECORDING_SAMPLE_RATE)
      const wavFile = new File([wavBlob], 'upload.wav', { type: 'audio/wav' })
      const pipelineResult = await speechApi.fullPipeline(wavFile, selectedVoice, selectedSpeed, 'zh')

      setChineseText(pipelineResult.recognized_text)
      setEnglishText(pipelineResult.translated_text)
      setGeneratedAudioUrl(pipelineResult.output_audio_url || '')
      setStep('done')

      handleSaveTranslation(
        pipelineResult.recognized_text,
        pipelineResult.translated_text,
        pipelineResult.total_time,
        selectedSpeed,
        selectedVoice
      )
    } catch (err: any) {
      console.error('Pipeline processing failed:', err)
      setErrorMessage(`处理失败: ${err.message || '未知错误'}`)
      setStep('error')
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  // Manual text input processing
  const handleManualTranslate = async () => {
    const text = chineseText.trim()
    if (!text) {
      setErrorMessage('请输入中文文本')
      return
    }

    console.log('[MANUAL-TRANSLATE] Current selectedVoice:', selectedVoice, 'selectedSpeed:', selectedSpeed)

    setStep('translating')
    try {
      // Translate via Python backend
      const transResult = await translationApi.translate(text)
      setEnglishText(transResult.translation)

      setStep('synthesizing')
      console.log('[FRONTEND] Synthesizing with voice:', selectedVoice, 'speed:', selectedSpeed)
      const synthResult = await speechApi.synthesize(transResult.translation, selectedVoice, selectedSpeed)
      setGeneratedAudioUrl(synthResult.audio_url || '')
      setStep('done')

      handleSaveTranslation(
        text,
        transResult.translation,
        synthResult.duration,
        selectedSpeed,
        selectedVoice
      )
    } catch (err: any) {
      console.error('Translation/Synthesis failed:', err)
      setErrorMessage(`处理失败: ${err.message || '未知错误'}`)
      setStep('error')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Select the best matching voice for current selection
  const selectBestVoice = (): SpeechSynthesisVoice | undefined => {
    if (availableVoices.length === 0) return undefined

    const englishVoices = availableVoices.filter((v) => v.lang.startsWith('en'))
    if (englishVoices.length === 0) return availableVoices[0]

    const config = VOICE_CONFIG[selectedVoice]
    if (!config) return englishVoices[0]

    for (const voice of englishVoices) {
      const nameLower = voice.name.toLowerCase()
      const localeMatch = config.localeKeywords.some((kw) => voice.lang.includes(kw))
      const genderMatch = config.genderKeywords.some((kw) => nameLower.includes(kw))
      if (localeMatch && genderMatch) return voice
    }

    for (const voice of englishVoices) {
      if (config.localeKeywords.some((kw) => voice.lang.includes(kw))) return voice
    }

    return englishVoices[0]
  }

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlay = () => {
    if (!englishText) return

    // If we have a backend-generated audio file, use it
    if (generatedAudioUrl) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
        return
      }

      if (audioRef.current) {
        audioRef.current.play()
        setIsPlaying(true)
        return
      }

      const audio = new Audio(generatedAudioUrl.startsWith('/') ? `http://localhost:8001${generatedAudioUrl}` : generatedAudioUrl)
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => {
        setIsPlaying(false)
        setErrorMessage('音频播放失败，请检查后端服务是否运行')
      }
      audioRef.current = audio
      audio.play()
      setIsPlaying(true)
      return
    }

    // Fallback: use browser SpeechSynthesis
    if (isPlaying) {
      speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }

    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(englishText)
    const hasChinese = /[\u4e00-\u9fff]/.test(englishText)
    utterance.lang = hasChinese ? 'zh-CN' : 'en-US'
    utterance.rate = SPEED_RATE_MAP[selectedSpeed] || 1.0

    const bestVoice = selectBestVoice()
    if (bestVoice) {
      utterance.voice = bestVoice
    }

    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    setIsPlaying(true)
    speechSynthesis.speak(utterance)
  }

  const handleReset = () => {
    setStep('idle')
    setChineseText('')
    setEnglishText('')
    setErrorMessage('')
    setUploadedFileName('')
    setRecordDuration(0)
    setInterimText('')
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    speechSynthesis.cancel()
    setIsPlaying(false)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const stepLabels: Record<ProcessStep, string> = {
    idle: '准备就绪',
    uploading: '上传音频中...',
    detecting: '端点检测中...',
    recognizing: '语音识别中...',
    translating: '翻译中...',
    synthesizing: '语音合成中...',
    done: '处理完成',
    error: '处理失败',
  }

  const stepOrder: ProcessStep[] = ['idle', 'uploading', 'detecting', 'recognizing', 'translating', 'synthesizing', 'done']
  const currentStepIndex = stepOrder.indexOf(step)

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* API Status Warning */}
      {apiError && (
        <div className="glass-card p-4 border-amber/30 flex items-center gap-3" role="alert">
          <XCircle className="w-5 h-5 text-amber flex-shrink-0" />
          <p className="text-sm text-amber">Python API 服务未运行。请先启动 Python API 服务器 (python-api/app/main.py)</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">语音翻译</h1>
          <p className="text-deep-600 mt-2">输入中文语音或文本，自动翻译为英文并合成语音</p>
        </div>
        {step !== 'idle' && (
          <button onClick={handleReset} className="btn-secondary text-sm">
            重新开始
          </button>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="glass-card p-4 border-rose/30 flex items-center gap-3" role="alert">
          <XCircle className="w-5 h-5 text-rose flex-shrink-0" />
          <p className="text-sm text-rose">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-6">
          {/* Recording */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-heading font-semibold text-white mb-4">语音输入</h2>

            {/* Waveform */}
            <div className="relative h-24 rounded-xl bg-deep-900/50 overflow-hidden mb-4">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                aria-label={isRecording ? '录音波形' : '空闲波形'}
              />
              {!isRecording && step === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-deep-600">点击下方按钮开始录音</p>
                </div>
              )}
            </div>

            {/* Duration display */}
            {isRecording && (
              <div className="text-center mb-4">
                <span className="text-2xl font-mono text-rose">{formatDuration(recordDuration)}</span>
              </div>
            )}

            {/* Interim recognition text */}
            {interimText && (
              <div className="text-center mb-4">
                <p className="text-sm text-deep-600 italic">正在识别: {interimText}</p>
              </div>
            )}

            {/* Record button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={step !== 'idle' && step !== 'done' && step !== 'error' && !isRecording}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 
                  ${isRecording
                    ? 'bg-rose shadow-lg shadow-rose/30 animate-pulse'
                    : 'bg-gradient-to-br from-emerald to-emerald-dark shadow-lg shadow-emerald/25 hover:shadow-emerald/40 hover:scale-105'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={isRecording ? '停止录音' : '开始录音'}
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>
            </div>

            {/* Upload */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={triggerFileUpload}
                disabled={step !== 'idle' && step !== 'done' && step !== 'error'}
                className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                上传音频文件
              </button>
              {uploadedFileName && step !== 'idle' && (
                <div className="flex items-center gap-2 text-xs text-deep-600">
                  <FileAudio className="w-4 h-4" />
                  {uploadedFileName}
                </div>
              )}
            </div>
          </div>

          {/* Chinese text result / manual input */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-white">识别结果</h2>
              <div className="flex gap-2">
                {chineseText && (
                  <button
                    onClick={() => handleCopy(chineseText)}
                    className="p-2 rounded-lg hover:bg-deep-700/50 transition-colors text-deep-600 hover:text-white"
                    aria-label="复制中文文本"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                {(step === 'idle' || step === 'done') && chineseText && (
                  <button
                    onClick={handleManualTranslate}
                    className="px-3 py-1 rounded-lg bg-emerald/20 text-emerald text-sm hover:bg-emerald/30 transition-colors"
                  >
                    翻译
                  </button>
                )}
              </div>
            </div>
            <div className="min-h-[100px] rounded-xl bg-deep-900/50 p-4">
              {step === 'recognizing' || step === 'detecting' ? (
                <div className="flex items-center gap-2 text-deep-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">正在识别语音...</span>
                </div>
              ) : chineseText ? (
                <p className="text-white leading-relaxed">{chineseText}</p>
              ) : (
                <p className="text-deep-600 text-sm">等待语音输入...</p>
              )}
            </div>
            {/* Manual text input */}
            <div className="mt-3">
              <label className="text-sm text-deep-600 mb-1 block">手动输入中文</label>
              <textarea
                value={chineseText}
                onChange={(e) => setChineseText(e.target.value)}
                className="input-field w-full min-h-[80px]"
                placeholder="请输入中文文本..."
              />
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="space-y-6">
          {/* Process steps */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-heading font-semibold text-white mb-4">处理状态</h2>
            <div className="space-y-3">
              {(['uploading', 'detecting', 'recognizing', 'translating', 'synthesizing', 'done'] as ProcessStep[]).map((s, i) => {
                const isActive = step === s
                const isCompleted = currentStepIndex > i || step === 'done'
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted ? 'bg-emerald' : isActive ? 'bg-amber animate-pulse' : 'bg-deep-700'}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-deep-600" />
                      )}
                    </div>
                    <span className={`text-sm ${isCompleted ? 'text-emerald' : isActive ? 'text-amber' : 'text-deep-600'}`}>
                      {stepLabels[s]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* English text result */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-white">翻译结果</h2>
              {englishText && (
                <button
                  onClick={() => handleCopy(englishText)}
                  className="p-2 rounded-lg hover:bg-deep-700/50 transition-colors text-deep-600 hover:text-white"
                  aria-label="复制英文文本"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="min-h-[100px] rounded-xl bg-deep-900/50 p-4">
              {step === 'translating' ? (
                <div className="flex items-center gap-2 text-deep-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">正在翻译...</span>
                </div>
              ) : englishText ? (
                <p className="text-white leading-relaxed">{englishText}</p>
              ) : (
                <p className="text-deep-600 text-sm">等待翻译结果...</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-heading font-semibold text-white mb-4">语音合成</h2>

            {/* Speed selection */}
            <div className="mb-4">
              <label className="text-sm text-deep-600 mb-2 block">语速</label>
              <div className="flex gap-2">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSpeed(s.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm transition-all duration-200
                      ${selectedSpeed === s.id
                        ? 'bg-emerald/20 text-emerald border border-emerald/30'
                        : 'bg-deep-700/30 text-deep-600 border border-transparent hover:bg-deep-700/50'
                      }`}
                  >
                    {s.name} <span className="text-xs opacity-60">{s.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice selection */}
            <div className="mb-6">
              <label className="text-sm text-deep-600 mb-2 block">音色</label>
              <div className="flex gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      console.log('[VOICE-BUTTON] Clicked:', v.id, 'previous:', selectedVoice)
                      setSelectedVoice(v.id)
                      // Log the new value immediately after setting
                      console.log('[VOICE-BUTTON] setSelectedVoice called with:', v.id)
                    }}
                    className={`flex-1 py-3 px-3 rounded-xl text-center transition-all duration-200
                      ${selectedVoice === v.id
                        ? 'bg-emerald/20 text-emerald border border-emerald/30'
                        : 'bg-deep-700/30 text-deep-600 border border-transparent hover:bg-deep-700/50'
                      }`}
                  >
                    <span className="text-2xl block">{v.emoji}</span>
                    <span className="text-xs mt-1 block">{v.name}</span>
                  </button>
                ))}
              </div>
              {availableVoices.length > 0 && (
                <p className="text-xs text-deep-600 mt-2">
                  当前可用语音: {availableVoices.filter(v => v.lang.startsWith('en')).length} 个英语语音
                </p>
              )}
              {/* DEBUG: Show actual state value */}
              <p className="text-xs text-rose mt-1">
                DEBUG: selectedVoice = {selectedVoice}
              </p>
            </div>

            {/* Play & Download */}
            <div className="flex gap-3">
              <button
                onClick={handlePlay}
                disabled={!englishText}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isPlaying ? '播放中...' : '播放音频'}
              </button>
              <button
                disabled={!englishText}
                className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                aria-label="下载音频"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
