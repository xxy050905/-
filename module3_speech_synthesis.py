"""
语音合成模块 (Text-to-Speech)
功能：多参数可调的英文语音合成系统
包含：语速控制（慢速/正常/快速）、多说话人音色选择
使用：edge-tts（微软Azure TTS，免费且高质量）
"""

import os
import asyncio
import tempfile
import wave
import numpy as np
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')


class SpeechSynthesizer:
    """
    语音合成器
    
    技术说明：
    1. 使用 edge-tts，基于微软Azure的文本转语音服务
    2. 支持多种声音（不同性别、口音）
    3. 支持语速、音调、音量调节
    4. 免费、高质量、无需API密钥
    
    可用声音：
    - en-US-GuyNeural: 男声（美式）
    - en-US-JennyNeural: 女声（美式）
    - en-GB-SoniaNeural: 女声（英式）
    - en-US-AriaNeural: 女声（美式，自然）
    - en-GB-RyanNeural: 男声（英式）
    """
    
    # 预定义的声音配置
    VOICE_CONFIGS = {
        'male_us': {'name': 'en-US-GuyNeural', 'description': '男声（美式）'},
        'female_us': {'name': 'en-US-JennyNeural', 'description': '女声（美式）'},
        'female_uk': {'name': 'en-GB-SoniaNeural', 'description': '女声（英式）'},
        'female_us_natural': {'name': 'en-US-AriaNeural', 'description': '女声（美式，自然）'},
        'male_uk': {'name': 'en-GB-RyanNeural', 'description': '男声（英式）'}
    }
    
    # 语速配置
    SPEED_CONFIGS = {
        'slow': '-30%',      # 慢速
        'normal': '+0%',     # 正常
        'fast': '+30%'       # 快速
    }
    
    def __init__(self, default_voice: str = 'female_us', default_speed: str = 'normal'):
        """
        初始化语音合成器
        
        参数:
            default_voice: 默认声音配置
            default_speed: 默认语速
        """
        self.default_voice = default_voice
        self.default_speed = default_speed
        
        # 确保输出目录存在
        os.makedirs('output_audio', exist_ok=True)
        
        print(f"语音合成器初始化完成")
        print(f"  默认声音: {self.VOICE_CONFIGS[default_voice]['description']}")
        print(f"  默认语速: {default_speed}")
    
    def synthesize(self, text: str, output_path: str = None,
                   voice: str = None, speed: str = None,
                   pitch: str = '+0Hz', volume: str = '+0%') -> str:
        """
        语音合成主函数
        
        参数:
            text: 要合成的英文文本
            output_path: 输出音频文件路径
            voice: 声音配置（如'male_us', 'female_us'）
            speed: 语速（'slow', 'normal', 'fast'）
            pitch: 音调调节（如'+0Hz', '+10Hz', '-10Hz'）
            volume: 音量调节（如'+0%', '+10%', '-10%'）
        返回:
            输出文件路径
        """
        voice = voice or self.default_voice
        speed = speed or self.default_speed
        
        if output_path is None:
            output_path = f"output_audio/synthesis_{voice}_{speed}.mp3"
        
        # 获取声音名称
        voice_name = self.VOICE_CONFIGS[voice]['name']
        speed_rate = self.SPEED_CONFIGS[speed]
        
        # 构建SSML（语音合成标记语言）
        ssml = self._build_ssml(text, voice_name, speed_rate, pitch, volume)
        
        # 异步合成（在新线程中运行，避免与FastAPI事件循环冲突）
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(
                self._run_async, ssml, output_path
            )
            future.result()  # 阻塞等待完成
        
        print(f"音频已保存至: {output_path}")
        return output_path
    
    def _run_async(self, ssml: str, output_path: str):
        """在新线程中运行异步合成"""
        import nest_asyncio
        nest_asyncio.apply()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self._synthesize_async(ssml, output_path))
        finally:
            loop.close()
    
    def _build_ssml(self, text: str, voice: str, rate: str, 
                    pitch: str, volume: str) -> str:
        """
        构建SSML语音合成标记
        
        SSML参数说明：
        - voice name: 声音名称
        - rate: 语速（百分比）
        - pitch: 音调（Hz或百分比）
        - volume: 音量（百分比）
        """
        ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="{voice}">
        <prosody rate="{rate}" pitch="{pitch}" volume="{volume}">
            {text}
        </prosody>
    </voice>
</speak>"""
        return ssml
    
    async def _synthesize_async(self, ssml: str, output_path: str):
        """异步执行语音合成 - 使用非SSML方式，更可靠"""
        import edge_tts
        import re
        
        # 从SSML中提取纯文本
        text = re.sub(r'<[^>]+>', '', ssml).strip()
        
        if not text:
            raise ValueError("No text to synthesize")
        
        # 检测文本语言：如果翻译失败（包含中文），使用中文语音
        has_chinese = any('\u4e00' <= c <= '\u9fff' for c in text)
        is_translation_failed = '[翻译失败]' in text
        
        if is_translation_failed:
            # 翻译失败时，用中文语音朗读原文
            voice = 'zh-CN-XiaoxiaoNeural'
            clean_text = text.replace('[翻译失败] ', '')
        elif has_chinese:
            # 未翻译但有中文，使用中文语音
            voice = 'zh-CN-XiaoxiaoNeural'
            clean_text = text
        else:
            voice_config = self.VOICE_CONFIGS.get(self.default_voice)
            voice = voice_config['name'] if voice_config else 'en-US-JennyNeural'
            clean_text = text
        
        speed_rate = self.SPEED_CONFIGS[self.default_speed]
        
        communicate = edge_tts.Communicate(
            text=clean_text,
            voice=voice,
            rate=speed_rate
        )
        
        await communicate.save(output_path)
    
    async def _synthesize_simple(self, text: str, output_path: str, 
                                  voice: str, rate: str):
        """简化的合成方法"""
        import edge_tts
        
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate
        )
        
        await communicate.save(output_path)
    
    def synthesize_batch(self, texts: List[str], output_dir: str = "output_audio",
                         voice: str = None, speed: str = None) -> List[str]:
        """
        批量语音合成
        
        参数:
            texts: 文本列表
            output_dir: 输出目录
            voice: 声音配置
            speed: 语速
        返回:
            输出文件路径列表
        """
        os.makedirs(output_dir, exist_ok=True)
        output_paths = []
        
        for i, text in enumerate(texts):
            output_path = os.path.join(output_dir, f"output_{i:03d}.mp3")
            path = self.synthesize(text, output_path, voice, speed)
            output_paths.append(path)
        
        return output_paths
    
    def create_speed_comparison(self, text: str, output_dir: str = "output_audio") -> Dict[str, str]:
        """
        创建不同语速的对比音频
        
        参数:
            text: 要合成的文本
            output_dir: 输出目录
        返回:
            不同语速的音频路径
        """
        os.makedirs(output_dir, exist_ok=True)
        results = {}
        
        for speed_name in ['slow', 'normal', 'fast']:
            output_path = os.path.join(output_dir, f"speed_comparison_{speed_name}.mp3")
            path = self.synthesize(text, output_path, speed=speed_name)
            results[speed_name] = path
        
        return results
    
    def create_voice_comparison(self, text: str, output_dir: str = "output_audio") -> Dict[str, str]:
        """
        创建不同音色的对比音频
        
        参数:
            text: 要合成的文本
            output_dir: 输出目录
        返回:
            不同音色的音频路径
        """
        os.makedirs(output_dir, exist_ok=True)
        results = {}
        
        for voice_name in ['male_us', 'female_us', 'female_uk']:
            output_path = os.path.join(output_dir, f"voice_comparison_{voice_name}.mp3")
            path = self.synthesize(text, output_path, voice=voice_name)
            results[voice_name] = path
        
        return results
    
    def visualize_audio(self, audio_path: str, save_path: str = None):
        """
        可视化音频波形和频谱
        
        参数:
            audio_path: 音频文件路径
            save_path: 可视化保存路径
        """
        import soundfile as sf
        import librosa
        
        if save_path is None:
            save_path = audio_path.replace('.mp3', '_waveform.png').replace('.wav', '_waveform.png')
        
        # 读取音频
        signal, sr = sf.read(audio_path)
        
        # 如果是立体声，转换为单声道
        if signal.ndim > 1:
            signal = np.mean(signal, axis=1)
        
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        
        fig, axes = plt.subplots(2, 1, figsize=(12, 6))
        
        # 波形图
        time = np.arange(len(signal)) / sr
        axes[0].plot(time, signal, linewidth=0.5, color='blue')
        axes[0].set_title(f'Waveform: {os.path.basename(audio_path)}')
        axes[0].set_xlabel('Time (s)')
        axes[0].set_ylabel('Amplitude')
        axes[0].grid(True, alpha=0.3)
        
        # 频谱图
        D = librosa.stft(signal)
        D_db = librosa.amplitude_to_db(np.abs(D), ref=np.max)
        
        img = librosa.display.specshow(D_db, sr=sr, x_axis='time', y_axis='hz', 
                                        ax=axes[1], cmap='viridis')
        axes[1].set_title('Spectrogram')
        axes[1].set_xlabel('Time (s)')
        axes[1].set_ylabel('Frequency (Hz)')
        plt.colorbar(img, ax=axes[1], format='%+2.0f dB')
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"音频可视化已保存至: {save_path}")
    
    def get_available_voices(self) -> List[Dict]:
        """
        获取可用声音列表
        
        返回:
            声音配置列表
        """
        return [
            {'key': k, **v} 
            for k, v in self.VOICE_CONFIGS.items()
        ]
    
    def analyze_audio_features(self, audio_path: str) -> Dict:
        """
        分析音频特征
        
        参数:
            audio_path: 音频文件路径
        返回:
            音频特征字典
        """
        import soundfile as sf
        import librosa
        
        signal, sr = sf.read(audio_path)
        if signal.ndim > 1:
            signal = np.mean(signal, axis=1)
        
        # 基本特征
        duration = len(signal) / sr
        rms = np.sqrt(np.mean(signal ** 2))
        
        # 频谱特征
        spectral_centroid = librosa.feature.spectral_centroid(y=signal, sr=sr)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=signal, sr=sr)
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y=signal)
        
        return {
            'duration': duration,
            'sample_rate': sr,
            'num_samples': len(signal),
            'rms_energy': rms,
            'mean_spectral_centroid': np.mean(spectral_centroid),
            'mean_spectral_rolloff': np.mean(spectral_rolloff),
            'mean_zero_crossing_rate': np.mean(zero_crossing_rate)
        }


# 使用示例
if __name__ == "__main__":
    # 初始化合成器
    synthesizer = SpeechSynthesizer()
    
    # 测试文本
    test_text = "Hello, this is a test of the text to speech system."
    
    # 1. 基本合成
    print("\n" + "="*50)
    print("基本语音合成")
    print("="*50)
    
    output_path = synthesizer.synthesize(test_text, "output_audio/test_basic.mp3")
    
    # 2. 语速对比
    print("\n" + "="*50)
    print("不同语速合成")
    print("="*50)
    
    speed_results = synthesizer.create_speed_comparison(
        "This is a comparison of different speech speeds.",
        "output_audio"
    )
    
    for speed, path in speed_results.items():
        print(f"{speed}: {path}")
        features = synthesizer.analyze_audio_features(path)
        print(f"  时长: {features['duration']:.2f}s")
    
    # 3. 音色对比
    print("\n" + "="*50)
    print("不同音色合成")
    print("="*50)
    
    voice_results = synthesizer.create_voice_comparison(
        "This is a comparison of different voice timbres.",
        "output_audio"
    )
    
    for voice, path in voice_results.items():
        print(f"{voice}: {path}")
        features = synthesizer.analyze_audio_features(path)
        print(f"  时长: {features['duration']:.2f}s")
        print(f"  频谱中心: {features['mean_spectral_centroid'][0]:.0f}Hz")
    
    # 4. 可视化
    synthesizer.visualize_audio(speed_results['normal'])
    synthesizer.visualize_audio(voice_results['female_us'])
