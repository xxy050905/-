"""
系统测试与演示脚本
功能：验证所有模块功能，提供端到端测试示例
"""

import os
import sys
import numpy as np
import soundfile as sf

def create_test_audio_files():
    """创建用于测试的音频文件"""
    os.makedirs('test_samples', exist_ok=True)
    os.makedirs('output_audio', exist_ok=True)
    os.makedirs('output_logs', exist_ok=True)
    
    sample_rate = 16000
    
    test_files = []
    
    # 样本1：简短问候（模拟语音信号）
    duration = 2.0
    t = np.arange(int(duration * sample_rate)) / sample_rate
    # 模拟语音谐波和共振峰结构
    signal = np.zeros_like(t)
    # 基频（模拟浊音）
    signal += 0.4 * np.sin(2 * np.pi * 150 * t + 2 * np.sin(2 * np.pi * 5 * t))
    # 第一共振峰
    signal += 0.25 * np.sin(2 * np.pi * 500 * t)
    # 第二共振峰
    signal += 0.15 * np.sin(2 * np.pi * 1500 * t)
    # 包络
    envelope = np.exp(-t * 1.5) * (1 - np.exp(-t * 20))
    signal *= envelope
    # 轻微噪声
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/test_greeting.wav', signal, sample_rate)
    test_files.append('test_samples/test_greeting.wav')
    
    # 样本2：模拟日常对话
    duration = 3.0
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    # 不同段模拟不同音素
    for i in range(6):
        start = int(i * 0.5 * sample_rate)
        end = int((i + 0.4) * sample_rate)
        base_freq = 120 + (i % 3) * 60
        seg_t = t[start:end] - t[start]
        envelope = np.exp(-seg_t * 3)
        signal[start:end] += 0.35 * np.sin(2 * np.pi * base_freq * t[start:end]) * envelope
        signal[start:end] += 0.2 * np.sin(2 * np.pi * base_freq * 2 * t[start:end]) * envelope
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/test_conversation.wav', signal, sample_rate)
    test_files.append('test_samples/test_conversation.wav')
    
    # 样本3：模拟数字识别
    duration = 2.5
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = 0.3 * np.sin(2 * np.pi * 180 * t + 5 * np.sin(2 * np.pi * 3 * t))
    signal += 0.15 * np.sin(2 * np.pi * 360 * t)
    signal += 0.1 * np.sin(2 * np.pi * 720 * t)
    signal *= np.exp(-t * 2)
    signal += np.random.randn(len(signal)) * 0.015
    sf.write('test_samples/test_numbers.wav', signal, sample_rate)
    test_files.append('test_samples/test_numbers.wav')
    
    # 样本4：带噪声环境
    duration = 3.0
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = 0.25 * np.sin(2 * np.pi * 200 * t)
    signal += 0.15 * np.sin(2 * np.pi * 400 * t)
    signal += 0.1 * np.sin(2 * np.pi * 800 * t)
    # 添加噪声
    signal += np.random.randn(len(signal)) * 0.06
    sf.write('test_samples/test_noisy.wav', signal, sample_rate)
    test_files.append('test_samples/test_noisy.wav')
    
    # 样本5：长句模拟
    duration = 5.0
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    for i in range(10):
        start = int(i * 0.5 * sample_rate)
        end = int((i + 0.4) * sample_rate)
        freq = 100 + (i % 5) * 80
        seg_t = t[start:end] - t[start]
        envelope = np.exp(-seg_t * 4)
        signal[start:end] += 0.3 * np.sin(2 * np.pi * freq * t[start:end]) * envelope
        signal[start:end] += 0.15 * np.sin(2 * np.pi * freq * 2 * t[start:end]) * envelope
    signal += np.random.randn(len(signal)) * 0.01
    sf.write('test_samples/test_long.wav', signal, sample_rate)
    test_files.append('test_samples/test_long.wav')
    
    print(f"已创建 {len(test_files)} 个测试音频文件")
    return test_files


def test_endpoint_detection():
    """测试端点检测模块"""
    print("\n" + "="*70)
    print("测试 1: 语音端点检测模块")
    print("="*70)
    
    from speech_processing.vad import SpeechEndpointDetector
    import librosa
    
    sample_rate = 16000
    
    # 创建含语音的测试信号
    duration = 4
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    
    # 前1秒：噪声
    signal[:int(1*sample_rate)] = np.random.randn(int(1*sample_rate)) * 0.02
    # 1-3秒：模拟语音
    speech_part = int(1*sample_rate)
    speech_end = int(3*sample_rate)
    signal[speech_part:speech_end] = 0.4 * np.sin(2 * np.pi * 250 * t[speech_part:speech_end])
    signal[speech_part:speech_end] += 0.2 * np.sin(2 * np.pi * 500 * t[speech_part:speech_end])
    # 3-4秒：噪声
    signal[speech_end:] = np.random.randn(int(1*sample_rate)) * 0.02
    
    # 创建检测器
    detector = SpeechEndpointDetector(sample_rate=sample_rate)
    
    # 检测
    extracted, start, end = detector.detect_and_extract(signal)
    
    print(f"  信号总长度: {len(signal)/sample_rate:.1f}s")
    print(f"  检测到语音段: {start/sample_rate:.2f}s - {end/sample_rate:.2f}s")
    print(f"  提取语音长度: {len(extracted)/sample_rate:.2f}s")
    
    # 评估
    gt_start = int(1 * sample_rate)
    gt_end = int(3 * sample_rate)
    metrics = detector.evaluate(signal, (gt_start, gt_end))
    print(f"\n  评估指标:")
    print(f"    IoU: {metrics['iou']:.3f}")
    print(f"    Precision: {metrics['precision']:.3f}")
    print(f"    Recall: {metrics['recall']:.3f}")
    print(f"    F1 Score: {metrics['f1_score']:.3f}")
    
    # 参数调优
    best_params = detector.tune_parameters(signal, (gt_start, gt_end))
    print(f"\n  最优参数: {best_params}")
    
    # 可视化
    detector.visualize_detection(signal, 'output_audio/vad_test_result.png')
    
    print("  ✓ 端点检测测试完成")
    return True


def test_preprocessing():
    """测试预处理模块"""
    print("\n" + "="*70)
    print("测试 2: 语音前处理模块")
    print("="*70)
    
    from speech_processing.preprocessing import SpeechPreprocessor
    
    sample_rate = 16000
    
    # 测试信号
    duration = 1
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.3 * np.sin(2 * np.pi * 880 * t)
    signal += np.random.randn(len(signal)) * 0.02
    
    # 创建预处理器
    preprocessor = SpeechPreprocessor(sample_rate=sample_rate)
    
    # 预处理
    frames_before, windowed_frames = preprocessor.preprocess(signal)
    
    print(f"  输入信号长度: {len(signal)} 样本")
    print(f"  帧长: {preprocessor.frame_length} 样本 ({25}ms)")
    print(f"  帧移: {preprocessor.frame_shift} 样本 ({10}ms)")
    print(f"  重叠率: {(1 - preprocessor.frame_shift/preprocessor.frame_length)*100:.1f}%")
    print(f"  总帧数: {len(frames_before)}")
    print(f"  处理后帧形状: {windowed_frames.shape}")
    
    # 统计信息
    stats = preprocessor.get_frame_statistics(signal)
    print(f"\n  统计信息:")
    print(f"    平均帧能量: {stats['avg_frame_energy']:.4f}")
    print(f"    最大帧能量: {stats['max_frame_energy']:.4f}")
    print(f"    最小帧能量: {stats['min_frame_energy']:.4f}")
    
    # 可视化
    preprocessor.visualize_preprocessing(signal, frame_idx=10, save_path='output_audio/preprocessing_result.png')
    
    print("  ✓ 预处理测试完成")
    return True


def test_mfcc():
    """测试MFCC提取模块"""
    print("\n" + "="*70)
    print("测试 3: MFCC特征提取模块")
    print("="*70)
    
    from speech_processing.preprocessing import MFCCExtractor
    
    sample_rate = 16000
    
    # 测试信号（模拟不同音素）
    duration = 1.5
    t = np.arange(int(duration * sample_rate)) / sample_rate
    signal = np.zeros_like(t)
    
    # 元音段
    idx1 = int(0.2 * sample_rate)
    idx2 = int(0.8 * sample_rate)
    signal[idx1:idx2] = 0.5 * np.sin(2 * np.pi * 200 * t[idx1:idx2])
    signal[idx1:idx2] += 0.3 * np.sin(2 * np.pi * 400 * t[idx1:idx2])
    
    # 辅音段
    idx3 = int(0.8 * sample_rate)
    idx4 = int(1.2 * sample_rate)
    signal[idx3:idx4] = 0.3 * np.random.randn(idx4 - idx3)
    
    signal += np.random.randn(len(signal)) * 0.01
    
    # 创建提取器
    extractor = MFCCExtractor(sample_rate=sample_rate, n_mfcc=13, n_mels=26, n_fft=512)
    
    # 提取MFCC
    mfcc_matrix = extractor.extract_mfcc_from_signal(signal)
    mfcc_with_deltas = extractor.extract_mfcc_with_deltas(signal)
    
    print(f"  MFCC特征矩阵形状: {mfcc_matrix.shape}")
    print(f"    帧数: {mfcc_matrix.shape[0]}")
    print(f"    系数数: {mfcc_matrix.shape[1]}")
    print(f"  带差分MFCC形状: {mfcc_with_deltas.shape}")
    
    # 特征统计
    stats = extractor.get_feature_statistics(mfcc_matrix)
    print(f"\n  特征统计:")
    print(f"    均值: {stats['overall_mean']:.3f}")
    print(f"    标准差: {stats['overall_std']:.3f}")
    print(f"    范围: [{stats['min']:.3f}, {stats['max']:.3f}]")
    
    # 可视化
    extractor.visualize_mel_filterbank(save_path='output_audio/mel_filterbank.png')
    extractor.visualize_mfcc(mfcc_matrix, save_path='output_audio/mfcc_heatmap.png')
    
    print("  ✓ MFCC提取测试完成")
    return True


def test_translation():
    """测试翻译模块"""
    print("\n" + "="*70)
    print("测试 4: 中文到英文翻译模块")
    print("="*70)
    
    from speech_processing.translation import ChineseToEnglishTranslator
    
    # 初始化翻译器
    translator = ChineseToEnglishTranslator()
    
    # 测试示例
    test_texts = [
        "你好，世界!",
        "今天天气很好，我想去公园散步。",
        "人工智能正在改变我们的生活方式。",
        "机器学习是人工智能的一个重要分支。",
        "这个系统可以将中文语音翻译成英文语音。",
        "深度学习需要大量的训练数据和计算资源。",
        "语音识别技术已经取得了很大的进步。"
    ]
    
    print("\n  翻译示例:")
    print("  " + "-"*60)
    
    for i, text in enumerate(test_texts):
        result = translator.translate_with_quality(text)
        print(f"\n  [{i+1}] 中文: {text}")
        print(f"      英文: {result['translation']}")
        print(f"      质量: {result['quality']['score']:.2f}")
    
    print("\n  ✓ 翻译测试完成")
    return True


def test_synthesis():
    """测试语音合成模块"""
    print("\n" + "="*70)
    print("测试 5: 语音合成模块")
    print("="*70)
    
    from speech_processing.synthesis import SpeechSynthesizer
    
    # 初始化合成器
    synthesizer = SpeechSynthesizer()
    
    # 测试文本
    test_text = "Hello, this is a test of the text to speech system."
    
    # 1. 基本合成
    print("\n  [1] 基本语音合成")
    output_path = synthesizer.synthesize(test_text, "output_audio/test_synthesis.mp3")
    features = synthesizer.analyze_audio_features(output_path)
    print(f"      输出: {output_path}")
    print(f"      时长: {features['duration']:.2f}s")
    
    # 2. 语速对比
    print("\n  [2] 不同语速合成")
    speed_results = synthesizer.create_speed_comparison(
        "This is a comparison of different speech speeds.",
        "output_audio"
    )
    
    for speed, path in speed_results.items():
        features = synthesizer.analyze_audio_features(path)
        print(f"      {speed}: 时长={features['duration']:.2f}s")
    
    # 3. 音色对比
    print("\n  [3] 不同音色合成")
    voice_results = synthesizer.create_voice_comparison(
        "This is a comparison of different voice timbres.",
        "output_audio"
    )
    
    for voice, path in voice_results.items():
        features = synthesizer.analyze_audio_features(path)
        centroid = features['mean_spectral_centroid']
        print(f"      {voice}: 时长={features['duration']:.2f}s, 频谱中心={centroid[0]:.0f}Hz")
    
    # 4. 可视化
    synthesizer.visualize_audio(speed_results['normal'], 'output_audio/synthesis_waveform.png')
    
    print("\n  ✓ 语音合成测试完成")
    return True


def test_end_to_end():
    """端到端系统测试"""
    print("\n" + "="*70)
    print("测试 6: 端到端系统集成测试")
    print("="*70)
    
    from main_system import SpeechTranslationSystem
    
    # 初始化系统
    system = SpeechTranslationSystem(
        recognition_model="tiny",  # 使用最小模型加速测试
        synthesis_voice="female_us",
        synthesis_speed="normal"
    )
    
    # 加载模块
    system.load_modules()
    
    # 创建测试音频
    test_files = create_test_audio_files()
    
    # 处理测试文件
    results = []
    for i, audio_path in enumerate(test_files[:3]):  # 测试前3个
        print(f"\n{'='*60}")
        print(f"处理测试文件 {i+1}/{min(3, len(test_files))}: {audio_path}")
        print(f"{'='*60}")
        
        result = system.process_audio(audio_path, f"e2e_test_{i}")
        results.append(result)
    
    # 总结
    print("\n" + "="*60)
    print("端到端测试总结")
    print("="*60)
    
    success_count = sum(1 for r in results if r['success'])
    print(f"  处理文件数: {len(results)}")
    print(f"  成功数: {success_count}")
    print(f"  成功率: {success_count/len(results)*100:.1f}%")
    
    for i, r in enumerate(results):
        if r['success']:
            print(f"\n  测试 {i+1}:")
            print(f"    输入: {r['input_audio']}")
            print(f"    中文: {r['steps']['recognition']['text']}")
            if 'translation' in r['steps'] and r['steps']['translation']['success']:
                print(f"    英文: {r['steps']['translation']['translation']}")
            if 'synthesis' in r['steps'] and r['steps']['synthesis']['success']:
                print(f"    输出: {r['steps']['synthesis']['output_path']}")
    
    print("\n  ✓ 端到端测试完成")
    return True


def run_all_tests():
    """运行所有测试"""
    print("\n" + "#"*70)
    print("#                   语音翻译系统 - 全面测试                     #")
    print("#"*70)
    
    test_results = {}
    
    # 创建输出目录
    os.makedirs('test_samples', exist_ok=True)
    os.makedirs('output_audio', exist_ok=True)
    os.makedirs('output_logs', exist_ok=True)
    
    # 测试各模块
    tests = [
        ("端点检测", test_endpoint_detection),
        ("预处理", test_preprocessing),
        ("MFCC提取", test_mfcc),
        ("翻译", test_translation),
        ("语音合成", test_synthesis),
    ]
    
    for name, test_func in tests:
        try:
            success = test_func()
            test_results[name] = success
        except Exception as e:
            print(f"\n  ✗ {name} 测试失败: {e}")
            test_results[name] = False
    
    # 端到端测试（可选，需要较长时间）
    print("\n" + "="*70)
    run_e2e = input("是否运行端到端测试？(y/n, 默认n): ").strip().lower()
    if run_e2e == 'y':
        try:
            success = test_end_to_end()
            test_results["端到端"] = success
        except Exception as e:
            print(f"\n  ✗ 端到端测试失败: {e}")
            test_results["端到端"] = False
    
    # 总结
    print("\n" + "#"*70)
    print("#                         测试总结                               #")
    print("#"*70)
    
    for name, success in test_results.items():
        status = "✓ 通过" if success else "✗ 失败"
        print(f"  {name:15s} {status}")
    
    total = len(test_results)
    passed = sum(1 for s in test_results.values() if s)
    print(f"\n  总计: {passed}/{total} 通过")
    print("#"*70)


if __name__ == "__main__":
    run_all_tests()
