"""
语音前处理模块 (Speech Preprocessing)
功能：实现完整的语音信号预处理流程
包含：分帧、预加重、加窗操作
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Tuple
import soundfile as sf


class SpeechPreprocessor:
    """
    语音预处理器
    
    预处理流程：
    1. 预加重 (Pre-emphasis)：提升高频分量，补偿发音过程中嘴唇辐射造成的能量损失
    2. 分帧 (Framing)：将连续信号切分为短时帧，假设短时内信号平稳
    3. 加窗 (Windowing)：减少帧边界处的不连续性，常用汉明窗
    """
    
    def __init__(self, sample_rate: int = 16000, frame_duration_ms: int = 25, 
                 frame_shift_ms: int = 10, preemphasis_coef: float = 0.97):
        """
        初始化预处理器
        
        参数:
            sample_rate: 采样率 (Hz)
            frame_duration_ms: 帧长 (毫秒)，通常25ms，保证短时平稳性
            frame_shift_ms: 帧移 (毫秒)，通常10ms，保证帧间连续性
            preemphasis_coef: 预加重系数，通常0.95-0.98
        """
        self.sample_rate = sample_rate
        self.frame_length = int(frame_duration_ms * sample_rate / 1000)
        self.frame_shift = int(frame_shift_ms * sample_rate / 1000)
        self.preemphasis_coef = preemphasis_coef
        
        print(f"预处理参数: 采样率={sample_rate}Hz, 帧长={self.frame_length}样本({frame_duration_ms}ms), "
              f"帧移={self.frame_shift}样本({frame_shift_ms}ms), 预加重系数={preemphasis_coef}")
    
    def preemphasis(self, signal: np.ndarray) -> np.ndarray:
        """
        预加重处理
        
        原理：y[n] = x[n] - α * x[n-1]，其中α通常取0.97
        作用：
        1. 提升高频分量，平衡频谱
        2. 消除发音过程中嘴唇辐射导致的高频衰减
        3. 提高信噪比，便于后续特征提取
        
        参数:
            signal: 输入信号
        返回:
            预加重后的信号
        """
        emphasized = np.zeros_like(signal)
        emphasized[0] = signal[0]  # 第一个点保持不变
        for n in range(1, len(signal)):
            emphasized[n] = signal[n] - self.preemphasis_coef * signal[n-1]
        
        # 等价的高效实现：emphasized = signal - alpha * np.append(0, signal[:-1])
        return emphasized
    
    def frame_signal(self, signal: np.ndarray) -> np.ndarray:
        """
        分帧处理
        
        原理：将连续信号切分为重叠的短帧
        帧长通常20-30ms，帧移10ms（重叠率约60-70%）
        
        参数选择依据：
        - 帧长：需保证短时平稳性（语音特性在短时间内不变）
        - 帧移：需保证足够的帧间连续性，同时避免冗余计算
        
        参数:
            signal: 输入信号
        返回:
            二维数组，每行是一帧信号
        """
        # 确保信号长度足够
        if len(signal) < self.frame_length:
            signal = np.pad(signal, (0, self.frame_length - len(signal)), 'constant')
        
        # 计算帧数
        num_frames = (len(signal) - self.frame_length) // self.frame_shift + 1
        
        # 分帧
        frames = np.zeros((num_frames, self.frame_length))
        for i in range(num_frames):
            start = i * self.frame_shift
            end = start + self.frame_length
            frames[i] = signal[start:end]
        
        return frames
    
    def hamming_window(self, frames: np.ndarray) -> np.ndarray:
        """
        加汉明窗
        
        原理：w[n] = 0.54 - 0.46 * cos(2πn/(N-1)), 0 ≤ n ≤ N-1
        作用：
        1. 减少帧两端的不连续性
        2. 降低频谱泄漏
        3. 使帧边界平滑过渡到零
        
        参数:
            frames: 分帧后的信号
        返回:
            加窗后的帧信号
        """
        # 生成汉明窗
        window = np.hamming(self.frame_length)
        # 应用窗函数
        windowed_frames = frames * window
        
        return windowed_frames
    
    def preprocess(self, signal: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        完整预处理流程
        
        流程：原始信号 → 预加重 → 分帧 → 加窗
        
        参数:
            signal: 输入音频信号
        返回:
            (原始分帧结果, 预处理后的帧信号)
        """
        # Step 1: 预加重
        emphasized_signal = self.preemphasis(signal)
        
        # Step 2: 分帧
        frames = self.frame_signal(emphasized_signal)
        
        # Step 3: 加窗
        windowed_frames = self.hamming_window(frames)
        
        return frames, windowed_frames
    
    def preprocess_full(self, signal: np.ndarray) -> np.ndarray:
        """
        完整预处理，只返回处理后的帧
        
        参数:
            signal: 输入音频信号
        返回:
            预处理后的帧信号
        """
        _, windowed_frames = self.preprocess(signal)
        return windowed_frames
    
    def visualize_preprocessing(self, signal: np.ndarray, frame_idx: int = 50, 
                                 save_path: str = 'preprocessing_result.png'):
        """
        可视化预处理各阶段结果
        
        参数:
            signal: 输入信号
            frame_idx: 要展示的帧索引
            save_path: 保存路径
        """
        # 预处理
        emphasized = self.preemphasis(signal)
        frames_before = self.frame_signal(signal)
        frames_after, windowed_frames = self.preprocess(signal)
        
        fig, axes = plt.subplots(4, 1, figsize=(14, 10))
        
        # 1. 原始信号
        time_full = np.arange(len(signal)) / self.sample_rate
        axes[0].plot(time_full, signal, color='blue', linewidth=0.5)
        axes[0].set_title('Original Signal')
        axes[0].set_xlabel('Time (s)')
        axes[0].set_ylabel('Amplitude')
        axes[0].grid(True, alpha=0.3)
        
        # 2. 预加重后信号
        axes[1].plot(time_full, emphasized, color='green', linewidth=0.5)
        axes[1].set_title('After Pre-emphasis')
        axes[1].set_xlabel('Time (s)')
        axes[1].set_ylabel('Amplitude')
        axes[1].grid(True, alpha=0.3)
        
        # 3. 单帧对比（加窗前 vs 加窗后）
        frame_time = np.arange(self.frame_length) / self.sample_rate * 1000  # ms
        axes[2].plot(frame_time, frames_before[frame_idx], 'b-', linewidth=1.5, label='Before Windowing')
        axes[2].plot(frame_time, windowed_frames[frame_idx], 'r--', linewidth=1.5, label='After Hamming Window')
        axes[2].set_title(f'Frame {frame_idx} - Before vs After Windowing')
        axes[2].set_xlabel('Time (ms)')
        axes[2].set_ylabel('Amplitude')
        axes[2].legend()
        axes[2].grid(True, alpha=0.3)
        
        # 4. 频谱对比
        from scipy.fft import fft
        freq_before = np.abs(fft(frames_before[frame_idx]))[:self.frame_length//2]
        freq_after = np.abs(fft(windowed_frames[frame_idx]))[:self.frame_length//2]
        freq_axis = np.arange(len(freq_before)) * self.sample_rate / self.frame_length
        
        axes[3].plot(freq_axis, freq_before, 'b-', linewidth=1, label='Before Windowing')
        axes[3].plot(freq_axis, freq_after, 'r--', linewidth=1, label='After Hamming Window')
        axes[3].set_title(f'Frame {frame_idx} - Spectrum Comparison')
        axes[3].set_xlabel('Frequency (Hz)')
        axes[3].set_ylabel('Magnitude')
        axes[3].legend()
        axes[3].grid(True, alpha=0.3)
        axes[3].set_xlim(0, 4000)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"预处理可视化已保存至: {save_path}")
    
    def get_frame_statistics(self, signal: np.ndarray) -> dict:
        """
        获取帧统计信息
        
        参数:
            signal: 输入信号
        返回:
            统计信息字典
        """
        emphasized = self.preemphasis(signal)
        frames = self.frame_signal(emphasized)
        windowed = self.hamming_window(frames)
        
        # 计算各帧能量
        energies = np.sum(windowed ** 2, axis=1)
        
        return {
            'num_frames': len(frames),
            'frame_length': self.frame_length,
            'frame_shift': self.frame_shift,
            'total_duration': len(signal) / self.sample_rate,
            'avg_frame_energy': np.mean(energies),
            'max_frame_energy': np.max(energies),
            'min_frame_energy': np.min(energies)
        }


# 使用示例
if __name__ == "__main__":
    import librosa
    
    sample_rate = 16000
    
    # 生成测试信号
    duration = 2
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.2 * np.sin(2 * np.pi * 880 * t)
    signal += np.random.randn(len(signal)) * 0.02
    
    # 创建预处理器
    preprocessor = SpeechPreprocessor(sample_rate=sample_rate)
    
    # 预处理
    frames_before, windowed_frames = preprocessor.preprocess(signal)
    print(f"\n帧数: {len(frames_before)}")
    print(f"每帧样本数: {preprocessor.frame_length}")
    print(f"重叠率: {(1 - preprocessor.frame_shift/preprocessor.frame_length)*100:.1f}%")
    
    # 统计信息
    stats = preprocessor.get_frame_statistics(signal)
    print(f"\n统计信息: {stats}")
    
    # 可视化
    preprocessor.visualize_preprocessing(signal, frame_idx=20)
