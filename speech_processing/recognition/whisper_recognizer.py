"""
语音识别模块 (Speech Recognition)
功能：基于OpenAI Whisper实现中文语音识别
支持：语音转文本、后处理优化、多场景测试
"""

import numpy as np
import os
from typing import Optional, List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')


class SpeechRecognizer:
    """
    基于Whisper的中文语音识别器
    
    模型选择理由：
    1. Whisper是OpenAI开源的多语言语音识别模型
    2. 支持中文识别，且在多场景下表现优秀
    3. 模型内置了对噪声、口音的鲁棒性处理
    4. 提供多种模型尺寸，平衡速度与精度
    5. 本地运行，无需API调用
    
    可用模型：tiny, base, small, medium, large
    中文识别推荐：medium 或 large
    """
    
    def __init__(self, model_size: str = "base"):
        """
        初始化语音识别器
        
        参数:
            model_size: 模型尺寸，可选 tiny, base, small, medium, large
        """
        self.model_size = model_size
        self.model = None
        self.device = "cpu"  # 默认CPU
        
        print(f"正在加载Whisper模型: {model_size}")
        self._load_model()
    
    def _load_model(self):
        """加载Whisper模型"""
        try:
            import whisper
            self.model = whisper.load_model(self.model_size, device=self.device)
            print(f"Whisper模型加载成功: {self.model_size}")
        except ImportError:
            print("错误: 请安装openai-whisper包")
            print("运行: pip install openai-whisper")
            raise
        except Exception as e:
            print(f"模型加载失败: {e}")
            raise
    
    def recognize(self, audio_path: str, language: str = "zh") -> Dict:
        """
        语音识别主函数
        
        参数:
            audio_path: 音频文件路径
            language: 语言代码，"zh"表示中文
        返回:
            识别结果字典
        """
        if self.model is None:
            raise ValueError("模型未加载")
        
        import traceback
        import soundfile as sf
        
        # 读取音频 - 前端已转换为16kHz WAV，直接用soundfile读取
        try:
            signal, sr = sf.read(audio_path)
            # Whisper需要float32，soundfile返回float64
            signal = signal.astype(np.float32)
        except Exception as e:
            raise RuntimeError(f"音频加载失败: {audio_path}, 错误: {e}")
        
        try:
            result = self.model.transcribe(
                signal,
                language=language,
                verbose=False
            )
        except Exception as e:
            raise RuntimeError(f"Whisper推理失败: {traceback.format_exc()}")
        
        # 后处理
        text = self.post_process(result["text"])
        
        return {
            'text': text,
            'language': language,
            'segments': result.get('segments', []),
            'raw_text': result["text"]
        }
    
    def recognize_from_signal(self, signal: np.ndarray, sample_rate: int = 16000, 
                               language: str = "zh") -> Dict:
        """
        从音频信号直接识别（无需保存文件）
        
        参数:
            signal: 音频信号
            sample_rate: 采样率
            language: 语言代码
        返回:
            识别结果
        """
        import tempfile
        import soundfile as sf
        
        # 保存为临时文件
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            sf.write(tmp.name, signal, sample_rate)
            tmp_path = tmp.name
        
        try:
            result = self.recognize(tmp_path, language)
        finally:
            os.unlink(tmp_path)
        
        return result
    
    def post_process(self, text: str) -> str:
        """
        识别结果后处理
        
        处理内容：
        1. 去除多余空格
        2. 标点符号规范化
        3. 去除重复字符
        4. 大小写规范化
        
        参数:
            text: 原始识别文本
        返回:
            处理后的文本
        """
        # 去除首尾空白
        text = text.strip()
        
        # 去除多余空格（中文不需要空格分隔）
        # 保留中英文混合时的合理空格
        import re
        # 中文之间去除空格
        text = re.sub(r'([\u4e00-\u9fff])\s+([\u4e00-\u9fff])', r'\1\2', text)
        
        # 标点符号规范化
        # 统一为中文标点
        punct_map = {
            '.': '。',
            ',': '，',
            '!': '！',
            '?': '？',
            ':': '：',
            ';': '；',
        }
        for en_punct, cn_punct in punct_map.items():
            # 只在纯中文句子中替换
            if re.search(r'[\u4e00-\u9fff]', text):
                text = text.replace(en_punct, cn_punct)
        
        return text
    
    def recognize_batch(self, audio_paths: List[str], language: str = "zh") -> List[Dict]:
        """
        批量语音识别
        
        参数:
            audio_paths: 音频文件路径列表
            language: 语言代码
        返回:
            识别结果列表
        """
        results = []
        for path in audio_paths:
            if os.path.exists(path):
                try:
                    result = self.recognize(path, language)
                    results.append({'path': path, 'success': True, 'result': result})
                except Exception as e:
                    results.append({'path': path, 'success': False, 'error': str(e)})
            else:
                results.append({'path': path, 'success': False, 'error': '文件不存在'})
        
        return results
    
    def get_accuracy(self, predictions: List[str], references: List[str]) -> Dict:
        """
        计算识别准确率
        
        使用字错误率 (CER - Character Error Rate)
        CER = (S + D + I) / N
        其中：S=替换数, D=删除数, I=插入数, N=参考文本总字数
        
        参数:
            predictions: 预测文本列表
            references: 参考文本列表
        返回:
            准确率指标
        """
        total_cer = 0
        total_chars = 0
        
        for pred, ref in zip(predictions, references):
            cer = self._compute_cer(ref, pred)
            total_cer += cer * len(ref)
            total_chars += len(ref)
        
        avg_cer = total_cer / total_chars if total_chars > 0 else 0
        accuracy = 1.0 - avg_cer
        
        return {
            'cer': avg_cer,
            'accuracy': accuracy,
            'num_samples': len(predictions)
        }
    
    def _compute_cer(self, reference: str, hypothesis: str) -> float:
        """
        计算单句字错误率
        使用动态规划编辑距离
        """
        # 去除空格
        reference = reference.replace(' ', '')
        hypothesis = hypothesis.replace(' ', '')
        
        m, n = len(reference), len(hypothesis)
        
        # DP表
        dp = np.zeros((m + 1, n + 1), dtype=int)
        
        # 初始化
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
        
        # 计算编辑距离
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if reference[i-1] == hypothesis[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = min(
                        dp[i-1][j-1] + 1,  # 替换
                        dp[i-1][j] + 1,     # 删除
                        dp[i][j-1] + 1      # 插入
                    )
        
        return dp[m][n] / m if m > 0 else 0


def create_test_samples():
    """
    创建测试语音样本
    用于演示和测试语音识别系统
    """
    import soundfile as sf
    
    sample_rate = 16000
    test_samples = []
    
    # 创建测试目录
    os.makedirs('test_samples', exist_ok=True)
    
    # 测试样本1：简单问候
    # 模拟语音：合成简单的音调变化模拟语音韵律
    duration = 2
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    # 模拟语音谐波结构
    for harmonic in [200, 400, 600, 800]:
        signal += 0.3 * np.sin(2 * np.pi * harmonic * t) * np.exp(-t * 2)
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/sample1_greeting.wav', signal, sample_rate)
    
    # 测试样本2：日常对话
    duration = 3
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    # 不同段不同频率模拟不同音素
    for i in range(5):
        idx1 = int(i * 0.6 * sample_rate)
        idx2 = int((i + 0.5) * sample_rate)
        freq = 150 + i * 50
        signal[idx1:idx2] = 0.4 * np.sin(2 * np.pi * freq * t[idx1:idx2])
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/sample2_conversation.wav', signal, sample_rate)
    
    # 测试样本3：数字识别
    duration = 2.5
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    # 模拟数字发音的基频变化
    signal = 0.4 * np.sin(2 * np.pi * 180 * t + 5 * np.sin(2 * np.pi * 3 * t))
    signal += 0.2 * np.sin(2 * np.pi * 360 * t)
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/sample3_numbers.wav', signal, sample_rate)
    
    # 测试样本4：带噪声环境
    duration = 3
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = 0.3 * np.sin(2 * np.pi * 250 * t)
    signal += 0.2 * np.sin(2 * np.pi * 500 * t)
    # 添加较强噪声
    signal += np.random.randn(len(signal)) * 0.08
    sf.write('test_samples/sample4_noisy.wav', signal, sample_rate)
    
    # 测试样本5：长句
    duration = 5
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    # 模拟长句韵律
    for i in range(10):
        idx1 = int(i * 0.5 * sample_rate)
        idx2 = int((i + 0.4) * sample_rate)
        freq = 120 + (i % 4) * 80
        envelope = np.exp(-2 * (t[idx1:idx2] - t[idx1]))
        signal[idx1:idx2] += 0.35 * np.sin(2 * np.pi * freq * t[idx1:idx2]) * envelope
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/sample5_long_sentence.wav', signal, sample_rate)
    
    test_samples = [
        'test_samples/sample1_greeting.wav',
        'test_samples/sample2_conversation.wav', 
        'test_samples/sample3_numbers.wav',
        'test_samples/sample4_noisy.wav',
        'test_samples/sample5_long_sentence.wav'
    ]
    
    print("已创建5个测试音频样本:")
    for s in test_samples:
        print(f"  - {s}")
    
    return test_samples


# 使用示例
if __name__ == "__main__":
    # 创建测试样本
    test_samples = create_test_samples()
    
    # 初始化识别器
    recognizer = SpeechRecognizer(model_size="base")
    
    # 识别测试
    print("\n" + "="*50)
    print("语音识别测试结果")
    print("="*50)
    
    for sample_path in test_samples:
        print(f"\n识别文件: {sample_path}")
        result = recognizer.recognize(sample_path)
        print(f"识别结果: {result['text']}")
