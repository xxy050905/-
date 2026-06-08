"""
语音端点检测模块 (Voice Activity Detection - VAD)
功能：检测并截取包含语音内容的音频片段
算法：基于能量和过零率的双门限端点检测
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Tuple, List


class SpeechEndpointDetector:
    """
    语音端点检测器
    
    算法原理：
    1. 短时能量 (Short-Time Energy)：语音段能量高于噪声段
    2. 短时过零率 (Short-Time Zero Crossing Rate)：清音段过零率高
    3. 双门限检测：结合能量和过零率进行两级判决
       - 第一级（高门限）：确定语音起始/结束的大致位置
       - 第二级（低门限）：精确定位语音端点
    """
    
    def __init__(self, sample_rate: int = 16000, frame_length: int = 256, 
                 frame_shift: int = 128, energy_threshold_ratio: float = 0.1,
                 zcr_threshold_ratio: float = 0.3, min_speech_frames: int = 10):
        """
        初始化端点检测器
        
        参数:
            sample_rate: 采样率 (Hz)
            frame_length: 帧长 (样本数)
            frame_shift: 帧移 (样本数)
            energy_threshold_ratio: 能量阈值比例（相对于最大能量的比例）
            zcr_threshold_ratio: 过零率阈值比例
            min_speech_frames: 最小语音帧数，低于此值视为噪声
        """
        self.sample_rate = sample_rate
        self.frame_length = frame_length
        self.frame_shift = frame_shift
        self.energy_threshold_ratio = energy_threshold_ratio
        self.zcr_threshold_ratio = zcr_threshold_ratio
        self.min_speech_frames = min_speech_frames
    
    def compute_short_time_energy(self, signal: np.ndarray) -> np.ndarray:
        """
        计算短时能量
        
        原理：E(n) = Σ[x(m)]^2, m从n到n+frame_length-1
        语音段能量显著高于噪声段
        
        参数:
            signal: 输入音频信号
        返回:
            每帧的短时能量
        """
        # 分帧
        frames = self._frame_signal(signal)
        # 计算每帧能量
        energy = np.sum(frames ** 2, axis=1)
        return energy
    
    def compute_zero_crossing_rate(self, signal: np.ndarray) -> np.ndarray:
        """
        计算短时过零率
        
        原理：ZCR(n) = (1/2L) * Σ|sgn[x(m)] - sgn[x(m-1)]|
        清音过零率高，浊音过零率低，噪声过零率较高但不稳定
        
        参数:
            signal: 输入音频信号
        返回:
            每帧的过零率
        """
        frames = self._frame_signal(signal)
        zcr = np.zeros(len(frames))
        
        for i, frame in enumerate(frames):
            # 计算过零次数
            zero_crossings = 0
            for j in range(1, len(frame)):
                if (frame[j] >= 0 and frame[j-1] < 0) or (frame[j] < 0 and frame[j-1] >= 0):
                    zero_crossings += 1
            # 归一化
            zcr[i] = zero_crossings / len(frame)
        
        return zcr
    
    def _frame_signal(self, signal: np.ndarray) -> np.ndarray:
        """将信号分帧"""
        num_frames = (len(signal) - self.frame_length) // self.frame_shift + 1
        frames = np.zeros((num_frames, self.frame_length))
        
        for i in range(num_frames):
            start = i * self.frame_shift
            end = start + self.frame_length
            frames[i] = signal[start:end]
        
        return frames
    
    def double_threshold_detection(self, signal: np.ndarray) -> Tuple[int, int]:
        """
        双门限端点检测算法
        
        步骤：
        1. 计算短时能量和过零率
        2. 根据背景噪声估计自适应阈值
        3. 第一级判决（高门限）：确定语音段
        4. 第二级判决（低门限）：扩展语音段边界
        
        参数:
            signal: 输入音频信号
        返回:
            (start_sample, end_sample) 语音段起止样本索引
        """
        # 计算特征
        energy = self.compute_short_time_energy(signal)
        zcr = self.compute_zero_crossing_rate(signal)
        
        # 自适应阈值计算
        # 假设前10%为纯噪声段，用于估计噪声特性
        noise_frames = max(5, len(energy) // 10)
        noise_energy_mean = np.mean(energy[:noise_frames])
        noise_energy_std = np.std(energy[:noise_frames])
        noise_zcr_mean = np.mean(zcr[:noise_frames])
        
        # 双门限设置
        energy_high_threshold = noise_energy_mean + 4 * noise_energy_std
        energy_low_threshold = noise_energy_mean + 2 * noise_energy_std
        zcr_threshold = noise_zcr_mean * self.zcr_threshold_ratio
        
        # 确保阈值合理
        max_energy = np.max(energy)
        energy_high_threshold = max(energy_high_threshold, max_energy * self.energy_threshold_ratio)
        energy_low_threshold = max(energy_low_threshold, energy_high_threshold * 0.3)
        
        # 第一级判决：高门限确定语音段
        speech_frames = np.zeros(len(energy), dtype=bool)
        for i in range(len(energy)):
            if energy[i] > energy_high_threshold:
                speech_frames[i] = True
        
        # 第二级判决：低门限扩展边界
        # 寻找语音段并扩展
        segments = []
        in_speech = False
        start_frame = 0
        
        for i in range(len(speech_frames)):
            if not in_speech and speech_frames[i]:
                in_speech = True
                start_frame = i
            elif in_speech and not speech_frames[i]:
                # 检查是否在低门限内
                if energy[i] > energy_low_threshold:
                    speech_frames[i] = True
                else:
                    in_speech = False
                    segments.append((start_frame, i))
        
        if in_speech:
            segments.append((start_frame, len(speech_frames)))
        
        # 合并相邻片段并过滤太短的片段
        merged_segments = self._merge_segments(segments)
        
        if len(merged_segments) == 0:
            return 0, len(signal)
        
        # 返回最长语音段
        longest_segment = max(merged_segments, key=lambda x: x[1] - x[0])
        start_sample = longest_segment[0] * self.frame_shift
        end_sample = min(longest_segment[1] * self.frame_shift + self.frame_length, len(signal))
        
        return start_sample, end_sample
    
    def _merge_segments(self, segments: List[Tuple[int, int]], 
                        max_gap_frames: int = 15) -> List[Tuple[int, int]]:
        """合并相邻的语音段"""
        if len(segments) == 0:
            return []
        
        merged = [segments[0]]
        
        for start, end in segments[1:]:
            prev_start, prev_end = merged[-1]
            # 如果间隔小于阈值，合并
            if start - prev_end < max_gap_frames:
                merged[-1] = (prev_start, max(prev_end, end))
            else:
                merged.append((start, end))
        
        # 过滤太短的段
        filtered = [(s, e) for s, e in merged 
                    if (e - s) >= self.min_speech_frames]
        
        return filtered
    
    def detect_and_extract(self, signal: np.ndarray) -> np.ndarray:
        """
        检测语音端点并提取语音片段
        
        参数:
            signal: 输入音频信号
        返回:
            提取的语音片段
        """
        start, end = self.double_threshold_detection(signal)
        return signal[start:end], start, end
    
    def tune_parameters(self, signal: np.ndarray, ground_truth: Tuple[int, int] = None) -> dict:
        """
        参数调优
        
        通过网格搜索找到最优参数组合
        
        参数:
            signal: 音频信号
            ground_truth: 真实的语音端点 (start, end)，如果提供则计算准确率
        返回:
            最优参数
        """
        best_params = None
        best_score = -1
        
        param_grid = {
            'energy_threshold_ratio': [0.05, 0.1, 0.2],
            'zcr_threshold_ratio': [0.2, 0.3, 0.5],
            'min_speech_frames': [5, 10, 20]
        }
        
        for energy_ratio in param_grid['energy_threshold_ratio']:
            for zcr_ratio in param_grid['zcr_threshold_ratio']:
                for min_frames in param_grid['min_speech_frames']:
                    detector = SpeechEndpointDetector(
                        sample_rate=self.sample_rate,
                        frame_length=self.frame_length,
                        frame_shift=self.frame_shift,
                        energy_threshold_ratio=energy_ratio,
                        zcr_threshold_ratio=zcr_ratio,
                        min_speech_frames=min_frames
                    )
                    
                    start, end = detector.double_threshold_detection(signal)
                    
                    if ground_truth:
                        gt_start, gt_end = ground_truth
                        # 计算IoU
                        intersection_start = max(start, gt_start)
                        intersection_end = min(end, gt_end)
                        intersection = max(0, intersection_end - intersection_start)
                        union = (end - start) + (gt_end - gt_start) - intersection
                        iou = intersection / union if union > 0 else 0
                        
                        if iou > best_score:
                            best_score = iou
                            best_params = {
                                'energy_threshold_ratio': energy_ratio,
                                'zcr_threshold_ratio': zcr_ratio,
                                'min_speech_frames': min_frames,
                                'iou': iou
                            }
                    else:
                        # 无标注数据，选择能量对比度最高的参数
                        extracted = signal[start:end]
                        if len(extracted) > 0:
                            speech_energy = np.mean(extracted ** 2)
                            noise_energy = np.mean(signal[:start+100] ** 2) if start > 0 else speech_energy * 0.1
                            contrast = speech_energy / (noise_energy + 1e-10)
                            
                            if contrast > best_score:
                                best_score = contrast
                                best_params = {
                                    'energy_threshold_ratio': energy_ratio,
                                    'zcr_threshold_ratio': zcr_ratio,
                                    'min_speech_frames': min_frames,
                                    'energy_contrast': contrast
                                }
        
        return best_params
    
    def evaluate(self, signal: np.ndarray, ground_truth: Tuple[int, int]) -> dict:
        """
        评估端点检测性能
        
        参数:
            signal: 音频信号
            ground_truth: 真实端点 (start, end)
        返回:
            评估指标字典
        """
        pred_start, pred_end = self.double_threshold_detection(signal)
        gt_start, gt_end = ground_truth
        
        # 计算指标
        intersection_start = max(pred_start, gt_start)
        intersection_end = min(pred_end, gt_end)
        intersection = max(0, intersection_end - intersection_start)
        
        pred_duration = pred_end - pred_start
        gt_duration = gt_end - gt_start
        union = pred_duration + gt_duration - intersection
        
        iou = intersection / union if union > 0 else 0
        precision = intersection / pred_duration if pred_duration > 0 else 0
        recall = intersection / gt_duration if gt_duration > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'iou': iou,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'predicted': (pred_start, pred_end),
            'ground_truth': ground_truth
        }
    
    def visualize_detection(self, signal: np.ndarray, save_path: str = 'vad_result.png'):
        """
        可视化端点检测结果
        
        参数:
            signal: 音频信号
            save_path: 保存路径
        """
        energy = self.compute_short_time_energy(signal)
        zcr = self.compute_zero_crossing_rate(signal)
        start, end = self.double_threshold_detection(signal)
        
        fig, axes = plt.subplots(3, 1, figsize=(12, 8))
        
        # 原始波形
        time = np.arange(len(signal)) / self.sample_rate
        axes[0].plot(time, signal, color='blue', linewidth=0.5)
        axes[0].axvspan(start / self.sample_rate, end / self.sample_rate, 
                        alpha=0.3, color='green', label='Detected Speech')
        axes[0].set_title('Original Waveform with Detected Speech Region')
        axes[0].set_xlabel('Time (s)')
        axes[0].set_ylabel('Amplitude')
        axes[0].legend()
        
        # 短时能量
        frame_times = np.arange(len(energy)) * self.frame_shift / self.sample_rate
        axes[1].plot(frame_times, energy, color='red', linewidth=0.8)
        axes[1].axvspan(start / self.sample_rate, end / self.sample_rate, 
                        alpha=0.3, color='green')
        axes[1].set_title('Short-Time Energy')
        axes[1].set_xlabel('Time (s)')
        axes[1].set_ylabel('Energy')
        
        # 过零率
        axes[2].plot(frame_times, zcr, color='purple', linewidth=0.8)
        axes[2].axvspan(start / self.sample_rate, end / self.sample_rate, 
                        alpha=0.3, color='green')
        axes[2].set_title('Zero Crossing Rate')
        axes[2].set_xlabel('Time (s)')
        axes[2].set_ylabel('ZCR')
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"端点检测可视化已保存至: {save_path}")


# 使用示例
if __name__ == "__main__":
    import librosa
    
    # 加载音频
    sample_rate = 16000
    # signal, sr = librosa.load('test_audio.wav', sr=sample_rate)
    
    # 生成测试信号（模拟语音+噪声）
    duration = 3  # 秒
    t = np.arange(int(duration * sample_rate)) / sample_rate
    
    # 前0.5秒：噪声
    noise = np.random.randn(int(0.5 * sample_rate)) * 0.01
    # 0.5-2.5秒：模拟语音（正弦波组合）
    speech = 0.5 * np.sin(2 * np.pi * 440 * t[int(0.5*sample_rate):int(2.5*sample_rate)])
    speech += 0.3 * np.sin(2 * np.pi * 880 * t[int(0.5*sample_rate):int(2.5*sample_rate)])
    # 2.5-3秒：噪声
    noise2 = np.random.randn(int(0.5 * sample_rate)) * 0.01
    
    signal = np.concatenate([noise, speech, noise2])
    
    # 创建检测器
    detector = SpeechEndpointDetector(sample_rate=sample_rate)
    
    # 端点检测
    extracted, start, end = detector.detect_and_extract(signal)
    print(f"检测到语音段: {start/sample_rate:.2f}s - {end/sample_rate:.2f}s")
    print(f"提取语音长度: {len(extracted)/sample_rate:.2f}s")
    
    # 参数调优
    best_params = detector.tune_parameters(signal, ground_truth=(int(0.5*sample_rate), int(2.5*sample_rate)))
    print(f"最优参数: {best_params}")
    
    # 评估
    metrics = detector.evaluate(signal, ground_truth=(int(0.5*sample_rate), int(2.5*sample_rate)))
    print(f"评估结果: IoU={metrics['iou']:.3f}, Precision={metrics['precision']:.3f}, "
          f"Recall={metrics['recall']:.3f}, F1={metrics['f1_score']:.3f}")
    
    # 可视化
    detector.visualize_detection(signal, 'vad_result.png')
