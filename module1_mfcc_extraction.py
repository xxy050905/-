"""
MFCC特征提取模块 (Mel-Frequency Cepstral Coefficients)
功能：实现完整的MFCC特征提取算法
包含：FFT、功率谱、梅尔滤波器组、对数运算、离散余弦变换(DCT)
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Tuple
from module1_preprocessing import SpeechPreprocessor


class MFCCExtractor:
    """
    MFCC特征提取器
    
    数学原理与公式推导：
    
    1. 傅里叶变换 (FFT)
       X[k] = Σ x[n] * e^(-j*2π*k*n/N), k=0,1,...,N-1
       将时域信号转换到频域
    
    2. 功率谱计算
       P[k] = |X[k]|^2 / N
    
    3. 梅尔滤波器组
       梅尔刻度公式：Mel(f) = 2595 * log10(1 + f/700)
       反向公式：f = 700 * (10^(Mel/2595) - 1)
       
       在梅尔刻度上均匀分布滤波器中心频率，然后映射回线性频率
    
    4. 对数能量
       S[m] = log(Σ P[k] * H_m[k])
       其中H_m[k]是第m个三角滤波器的响应
    
    5. 离散余弦变换 (DCT)
       c[n] = Σ S[m] * cos(π*n*(m-0.5)/M), n=1,2,...,L
       M为滤波器个数，L为MFCC系数个数（通常12-13）
    """
    
    def __init__(self, sample_rate: int = 16000, n_mfcc: int = 13, 
                 n_mels: int = 26, n_fft: int = 512, f_min: int = 0, 
                 f_max: int = None):
        """
        初始化MFCC提取器
        
        参数:
            sample_rate: 采样率 (Hz)
            n_mfcc: MFCC系数个数，通常12或13
            n_mels: 梅尔滤波器个数，通常20-40
            n_fft: FFT点数，通常256或512
            f_min: 最低频率 (Hz)
            f_max: 最高频率 (Hz)，默认为采样率的一半
        """
        self.sample_rate = sample_rate
        self.n_mfcc = n_mfcc
        self.n_mels = n_mels
        self.n_fft = n_fft
        self.f_min = f_min
        self.f_max = f_max if f_max is not None else sample_rate // 2
        
        # 预处理器
        self.preprocessor = SpeechPreprocessor(sample_rate=sample_rate)
        
        # 预计算梅尔滤波器组
        self.mel_filterbank = self._create_mel_filterbank()
        
        print(f"MFCC参数: n_mfcc={n_mfcc}, n_mels={n_mels}, n_fft={n_fft}, "
              f"f_min={f_min}Hz, f_max={self.f_max}Hz")
    
    @staticmethod
    def hz_to_mel(freq_hz: float) -> float:
        """
        赫兹转梅尔刻度
        
        公式：Mel(f) = 2595 * log10(1 + f/700)
        
        参数:
            freq_hz: 频率（Hz）
        返回:
            梅尔刻度值
        """
        return 2595.0 * np.log10(1.0 + freq_hz / 700.0)
    
    @staticmethod
    def mel_to_hz(mel: float) -> float:
        """
        梅尔刻度转赫兹
        
        公式：f = 700 * (10^(Mel/2595) - 1)
        
        参数:
            mel: 梅尔刻度值
        返回:
            频率（Hz）
        """
        return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)
    
    def _create_mel_filterbank(self) -> np.ndarray:
        """
        创建梅尔滤波器组
        
        步骤：
        1. 将f_min到f_max转换到梅尔刻度
        2. 在梅尔刻度上均匀分布n_mels+2个点
        3. 转换回线性频率
        4. 创建三角滤波器
        5. 归一化每个滤波器
        
        返回:
            梅尔滤波器组矩阵，形状为(n_mels, n_fft//2+1)
        """
        # 1. 频率转梅尔
        mel_min = self.hz_to_mel(self.f_min)
        mel_max = self.hz_to_mel(self.f_max)
        
        # 2. 梅尔刻度均匀分布（+2是因为两端点不形成滤波器）
        mel_points = np.linspace(mel_min, mel_max, self.n_mels + 2)
        
        # 3. 梅尔转回赫兹
        hz_points = self.mel_to_hz(mel_points)
        
        # 4. 赫兹转FFT bin索引
        bin_points = np.floor((self.n_fft + 1) * hz_points / self.sample_rate).astype(int)
        bin_points = np.clip(bin_points, 0, self.n_fft // 2)
        
        # 5. 创建三角滤波器
        mel_filterbank = np.zeros((self.n_mels, self.n_fft // 2 + 1))
        
        for m in range(1, self.n_mels + 1):
            # 左斜坡
            for k in range(bin_points[m-1], bin_points[m]):
                mel_filterbank[m-1, k] = (k - bin_points[m-1]) / (bin_points[m] - bin_points[m-1])
            # 右斜坡
            for k in range(bin_points[m], bin_points[m+1]):
                mel_filterbank[m-1, k] = (bin_points[m+1] - k) / (bin_points[m+1] - bin_points[m])
        
        return mel_filterbank
    
    def compute_fft(self, frame: np.ndarray) -> np.ndarray:
        """
        计算FFT
        
        公式：X[k] = Σ x[n] * e^(-j*2π*k*n/N)
        
        参数:
            frame: 一帧信号
        返回:
            FFT结果的前半部分（正频率）
        """
        # 补零到n_fft长度
        padded_frame = np.zeros(self.n_fft)
        padded_frame[:len(frame)] = frame
        
        # FFT
        fft_result = np.fft.rfft(padded_frame)
        return fft_result
    
    def compute_power_spectrum(self, fft_result: np.ndarray) -> np.ndarray:
        """
        计算功率谱
        
        公式：P[k] = |X[k]|^2 / N
        
        参数:
            fft_result: FFT结果
        返回:
            功率谱
        """
        power = np.abs(fft_result) ** 2 / self.n_fft
        return power
    
    def apply_mel_filterbank(self, power_spectrum: np.ndarray) -> np.ndarray:
        """
        应用梅尔滤波器组
        
        公式：S[m] = Σ P[k] * H_m[k]
        
        参数:
            power_spectrum: 功率谱
        返回:
            梅尔能量，形状为(n_mels,)
        """
        # 只取前半部分（正频率）
        power = power_spectrum[:self.n_fft // 2 + 1]
        
        # 应用滤波器组
        mel_energy = np.dot(self.mel_filterbank, power)
        
        # 避免log(0)
        mel_energy = np.maximum(mel_energy, 1e-10)
        
        return mel_energy
    
    def compute_dct(self, mel_log_energy: np.ndarray) -> np.ndarray:
        """
        离散余弦变换 (DCT Type-II)
        
        公式：c[n] = Σ S[m] * cos(π*n*(m-0.5)/M)
        其中n=1,2,...,L，M为滤波器个数
        
        参数:
            mel_log_energy: 对数梅尔能量
        返回:
            MFCC系数
        """
        M = len(mel_log_energy)
        mfcc = np.zeros(self.n_mfcc)
        
        for n in range(self.n_mfcc):
            # DCT公式
            for m in range(M):
                mfcc[n] += mel_log_energy[m] * np.cos(np.pi * n * (m + 0.5) / M)
        
        return mfcc
    
    def extract_mfcc(self, frame: np.ndarray) -> np.ndarray:
        """
        从单帧提取MFCC特征
        
        完整流程：
        原始帧 → FFT → 功率谱 → 梅尔滤波器 → 对数 → DCT → MFCC
        
        参数:
            frame: 一帧预处理后的信号
        返回:
            MFCC系数向量
        """
        # Step 1: FFT
        fft_result = self.compute_fft(frame)
        
        # Step 2: 功率谱
        power_spectrum = self.compute_power_spectrum(fft_result)
        
        # Step 3: 梅尔滤波器组
        mel_energy = self.apply_mel_filterbank(power_spectrum)
        
        # Step 4: 对数运算
        mel_log_energy = np.log(mel_energy)
        
        # Step 5: DCT
        mfcc = self.compute_dct(mel_log_energy)
        
        return mfcc
    
    def extract_mfcc_from_signal(self, signal: np.ndarray) -> np.ndarray:
        """
        从完整信号提取MFCC特征矩阵
        
        参数:
            signal: 输入音频信号
        返回:
            MFCC特征矩阵，形状为(num_frames, n_mfcc)
        """
        # 预处理
        windowed_frames = self.preprocessor.preprocess_full(signal)
        
        # 逐帧提取MFCC
        num_frames = len(windowed_frames)
        mfcc_matrix = np.zeros((num_frames, self.n_mfcc))
        
        for i in range(num_frames):
            mfcc_matrix[i] = self.extract_mfcc(windowed_frames[i])
        
        return mfcc_matrix
    
    def extract_mfcc_with_deltas(self, signal: np.ndarray) -> np.ndarray:
        """
        提取MFCC及其一阶、二阶差分
        
        差分系数捕获特征的动态变化，提高识别准确率
        
        参数:
            signal: 输入音频信号
        返回:
            拼接后的特征矩阵 (n_mfcc * 3 维)
        """
        mfcc = self.extract_mfcc_from_signal(signal)
        
        # 一阶差分
        delta1 = np.zeros_like(mfcc)
        for t in range(1, len(mfcc)):
            delta1[t] = mfcc[t] - mfcc[t-1]
        
        # 二阶差分
        delta2 = np.zeros_like(mfcc)
        for t in range(1, len(delta1)):
            delta2[t] = delta1[t] - delta1[t-1]
        
        # 拼接
        mfcc_with_deltas = np.hstack([mfcc, delta1, delta2])
        
        return mfcc_with_deltas
    
    def visualize_mel_filterbank(self, save_path: str = 'mel_filterbank.png'):
        """
        可视化梅尔滤波器组
        
        参数:
            save_path: 保存路径
        """
        freq_axis = np.arange(self.n_fft // 2 + 1) * self.sample_rate / self.n_fft
        
        plt.figure(figsize=(10, 6))
        for i in range(self.n_mels):
            plt.plot(freq_axis, self.mel_filterbank[i], linewidth=1.5)
        
        plt.title(f'Mel Filter Bank ({self.n_mels} filters)')
        plt.xlabel('Frequency (Hz)')
        plt.ylabel('Amplitude')
        plt.grid(True, alpha=0.3)
        plt.xlim(self.f_min, self.f_max)
        plt.tight_layout()
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"梅尔滤波器组可视化已保存至: {save_path}")
    
    def visualize_mfcc(self, mfcc_matrix: np.ndarray, save_path: str = 'mfcc_heatmap.png'):
        """
        可视化MFCC特征热力图
        
        参数:
            mfcc_matrix: MFCC特征矩阵
            save_path: 保存路径
        """
        plt.figure(figsize=(12, 6))
        
        # 转置以便时间轴为x轴
        mfcc_T = mfcc_matrix.T
        
        im = plt.imshow(mfcc_T, aspect='auto', origin='lower', cmap='viridis')
        plt.colorbar(im, label='Coefficient Value')
        
        plt.title(f'MFCC Features ({self.n_mfcc} coefficients)')
        plt.xlabel('Frame Index')
        plt.ylabel('MFCC Coefficient Index')
        plt.tight_layout()
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        print(f"MFCC特征可视化已保存至: {save_path}")
    
    def get_feature_statistics(self, mfcc_matrix: np.ndarray) -> dict:
        """
        获取MFCC特征统计信息
        
        参数:
            mfcc_matrix: MFCC特征矩阵
        返回:
            统计信息
        """
        return {
            'shape': mfcc_matrix.shape,
            'mean_per_coefficient': np.mean(mfcc_matrix, axis=0),
            'std_per_coefficient': np.std(mfcc_matrix, axis=0),
            'min': np.min(mfcc_matrix),
            'max': np.max(mfcc_matrix),
            'overall_mean': np.mean(mfcc_matrix),
            'overall_std': np.std(mfcc_matrix)
        }


# 使用示例
if __name__ == "__main__":
    sample_rate = 16000
    
    # 生成测试信号
    duration = 1.5
    t = np.arange(int(duration * sample_rate)) / sample_rate
    
    # 模拟不同音素
    signal = np.zeros_like(t)
    # 元音段（低频谐波）
    idx1 = int(0.2 * sample_rate)
    idx2 = int(0.8 * sample_rate)
    signal[idx1:idx2] = 0.5 * np.sin(2 * np.pi * 200 * t[idx1:idx2])
    signal[idx1:idx2] += 0.3 * np.sin(2 * np.pi * 400 * t[idx1:idx2])
    signal[idx1:idx2] += 0.2 * np.sin(2 * np.pi * 600 * t[idx1:idx2])
    
    # 辅音段（高频噪声）
    idx3 = int(0.8 * sample_rate)
    idx4 = int(1.2 * sample_rate)
    signal[idx3:idx4] = 0.3 * np.random.randn(idx4 - idx3)
    
    # 添加轻微噪声
    signal += np.random.randn(len(signal)) * 0.01
    
    # 创建MFCC提取器
    extractor = MFCCExtractor(sample_rate=sample_rate, n_mfcc=13, n_mels=26, n_fft=512)
    
    # 提取MFCC
    mfcc_matrix = extractor.extract_mfcc_from_signal(signal)
    print(f"\nMFCC特征矩阵形状: {mfcc_matrix.shape}")
    
    # 提取带差分的MFCC
    mfcc_with_deltas = extractor.extract_mfcc_with_deltas(signal)
    print(f"带差分的MFCC特征矩阵形状: {mfcc_with_deltas.shape}")
    
    # 统计信息
    stats = extractor.get_feature_statistics(mfcc_matrix)
    print(f"\n特征统计: 均值={stats['overall_mean']:.3f}, 标准差={stats['overall_std']:.3f}")
    
    # 可视化
    extractor.visualize_mel_filterbank()
    extractor.visualize_mfcc(mfcc_matrix)
