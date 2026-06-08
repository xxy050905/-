"""
系统集成模块 (System Integration)
功能：将语音识别、翻译、语音合成三个模块串联
实现完整流程：中文语音输入 → 中文文本 → 英文文本 → 英文语音输出
"""

import os
import sys
import time
import numpy as np
import soundfile as sf
from typing import Dict, Optional
import warnings
warnings.filterwarnings('ignore')


class SpeechTranslationSystem:
    """
    中文语音翻译系统
    
    系统架构：
    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
    │  中文语音输入 │───→│ 语音识别模块  │───→│  中文文本输出  │
    └─────────────┘    └──────────────┘    └──────────────┘
                                                    │
                                                    ▼
    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
    │  英文语音输出 │←───│ 语音合成模块  │←───│  英文文本输出  │
    └─────────────┘    └──────────────┘    └──────────────┘
                              ▲
                              │
                       ┌──────────────┐
                       │  翻译模块     │
                       └──────────────┘
    
    数据流转：
    1. 音频文件 → 端点检测 → 语音片段
    2. 语音片段 → 预处理 → 特征提取
    3. 特征 → Whisper模型 → 中文文本
    4. 中文文本 → 翻译模型 → 英文文本
    5. 英文文本 → TTS → 英文语音
    """
    
    def __init__(self, recognition_model: str = "base",
                 translation_model: str = "Helsinki-NLP/opus-mt-zh-en",
                 synthesis_voice: str = "female_us",
                 synthesis_speed: str = "normal"):
        """
        初始化系统集成
        
        参数:
            recognition_model: 语音识别模型尺寸
            translation_model: 翻译模型名称
            synthesis_voice: 合成声音
            synthesis_speed: 合成语速
        """
        self.recognition_model = recognition_model
        self.synthesis_voice = synthesis_voice
        self.synthesis_speed = synthesis_speed
        
        # 输出目录
        os.makedirs('output_audio', exist_ok=True)
        os.makedirs('output_logs', exist_ok=True)
        
        print("="*60)
        print("中文语音翻译系统初始化")
        print("="*60)
        
        # 加载各模块
        self.recognizer = None
        self.translator = None
        self.synthesizer = None
        
        print(f"\n配置:")
        print(f"  语音识别模型: {recognition_model}")
        print(f"  翻译模型: {translation_model}")
        print(f"  合成声音: {synthesis_voice}")
        print(f"  合成语速: {synthesis_speed}")
    
    def load_modules(self):
        """加载所有模块"""
        print("\n正在加载模块...")
        
        # 加载语音识别模块
        print("\n[1/3] 加载语音识别模块...")
        from speech_processing.recognition import SpeechRecognizer
        self.recognizer = SpeechRecognizer(model_size=self.recognition_model)
        
        # 加载翻译模块
        print("\n[2/3] 加载翻译模块...")
        from speech_processing.translation import ChineseToEnglishTranslator
        self.translator = ChineseToEnglishTranslator()
        
        # 加载语音合成模块
        print("\n[3/3] 加载语音合成模块...")
        from speech_processing.synthesis import SpeechSynthesizer
        self.synthesizer = SpeechSynthesizer(
            default_voice=self.synthesis_voice,
            default_speed=self.synthesis_speed
        )
        
        print("\n所有模块加载完成!")
    
    def process_audio(self, audio_path: str, output_prefix: str = "output") -> Dict:
        """
        处理单个音频文件的完整流程
        
        参数:
            audio_path: 输入音频文件路径
            output_prefix: 输出文件前缀
        返回:
            完整的处理结果
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"音频文件不存在: {audio_path}")
        
        result = {
            'input_audio': audio_path,
            'steps': {},
            'success': False
        }
        
        print("\n" + "="*60)
        print(f"开始处理: {audio_path}")
        print("="*60)
        
        # Step 1: 语音识别
        print("\n[Step 1] 语音识别 - 中文语音转文本")
        start_time = time.time()
        try:
            recognition_result = self.recognizer.recognize(audio_path, language="zh")
            chinese_text = recognition_result['text']
            result['steps']['recognition'] = {
                'text': chinese_text,
                'time': time.time() - start_time,
                'success': True
            }
            print(f"  识别结果: {chinese_text}")
            print(f"  耗时: {result['steps']['recognition']['time']:.2f}s")
        except Exception as e:
            result['steps']['recognition'] = {
                'text': '',
                'error': str(e),
                'time': time.time() - start_time,
                'success': False
            }
            print(f"  识别失败: {e}")
            return result
        
        if not chinese_text.strip():
            print("  识别结果为空，跳过后续处理")
            return result
        
        # Step 2: 翻译
        print("\n[Step 2] 翻译 - 中文转英文")
        start_time = time.time()
        try:
            translation_result = self.translator.translate_with_quality(chinese_text)
            english_text = translation_result['translation']
            result['steps']['translation'] = {
                'source': chinese_text,
                'translation': english_text,
                'quality': translation_result['quality'],
                'time': time.time() - start_time,
                'success': True
            }
            print(f"  翻译结果: {english_text}")
            print(f"  耗时: {result['steps']['translation']['time']:.2f}s")
        except Exception as e:
            result['steps']['translation'] = {
                'source': chinese_text,
                'error': str(e),
                'time': time.time() - start_time,
                'success': False
            }
            print(f"  翻译失败: {e}")
            return result
        
        # Step 3: 语音合成
        print("\n[Step 3] 语音合成 - 英文文本转语音")
        start_time = time.time()
        try:
            output_path = f"output_audio/{output_prefix}_output.mp3"
            self.synthesizer.synthesize(
                text=english_text,
                output_path=output_path,
                voice=self.synthesis_voice,
                speed=self.synthesis_speed
            )
            result['steps']['synthesis'] = {
                'output_path': output_path,
                'time': time.time() - start_time,
                'success': True
            }
            print(f"  输出音频: {output_path}")
            print(f"  耗时: {result['steps']['synthesis']['time']:.2f}s")
        except Exception as e:
            result['steps']['synthesis'] = {
                'error': str(e),
                'time': time.time() - start_time,
                'success': False
            }
            print(f"  合成失败: {e}")
            return result
        
        result['success'] = True
        result['total_time'] = sum(s.get('time', 0) for s in result['steps'].values())
        
        print("\n" + "="*60)
        print("处理完成!")
        print(f"  中文: {chinese_text}")
        print(f"  英文: {english_text}")
        print(f"  输出: {output_path}")
        print(f"  总耗时: {result['total_time']:.2f}s")
        print("="*60)
        
        # 保存日志
        self._save_log(result, output_prefix)
        
        return result
    
    def _save_log(self, result: Dict, prefix: str):
        """保存处理日志"""
        log_path = f"output_logs/{prefix}_log.txt"
        
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write("="*60 + "\n")
            f.write("语音翻译系统处理日志\n")
            f.write("="*60 + "\n\n")
            f.write(f"输入音频: {result['input_audio']}\n")
            f.write(f"处理状态: {'成功' if result['success'] else '失败'}\n\n")
            
            for step_name, step_result in result['steps'].items():
                f.write(f"--- {step_name.upper()} ---\n")
                for key, value in step_result.items():
                    if key != 'success':
                        f.write(f"  {key}: {value}\n")
                f.write("\n")
        
        print(f"\n日志已保存至: {log_path}")
    
    def process_batch(self, audio_paths: list) -> list:
        """
        批量处理音频
        
        参数:
            audio_paths: 音频文件路径列表
        返回:
            处理结果列表
        """
        results = []
        for i, path in enumerate(audio_paths):
            prefix = f"batch_{i:03d}"
            result = self.process_audio(path, prefix)
            results.append(result)
        
        return results


class SystemCLI:
    """
    系统命令行交互界面
    
    功能：
    1. 单文件处理
    2. 批量处理
    3. 系统配置
    4. 演示模式
    """
    
    def __init__(self):
        self.system = None
    
    def run(self):
        """运行命令行界面"""
        print("\n" + "="*60)
        print("       中文语音翻译系统 - 命令行界面")
        print("="*60)
        print("\n功能:")
        print("  1. 单文件处理 - 处理单个中文语音文件")
        print("  2. 批量处理   - 处理多个中文语音文件")
        print("  3. 演示模式   - 使用测试样本演示完整流程")
        print("  4. 系统配置   - 调整系统参数")
        print("  5. 退出系统")
        print("="*60)
        
        while True:
            try:
                choice = input("\n请选择功能 (1-5): ").strip()
                
                if choice == '1':
                    self._single_file_mode()
                elif choice == '2':
                    self._batch_mode()
                elif choice == '3':
                    self._demo_mode()
                elif choice == '4':
                    self._config_mode()
                elif choice in ['5', 'q', 'quit', 'exit']:
                    print("\n感谢使用，再见!")
                    break
                else:
                    print("无效选择，请重新输入")
            
            except KeyboardInterrupt:
                print("\n\n感谢使用，再见!")
                break
    
    def _init_system(self):
        """初始化系统"""
        if self.system is None:
            self.system = SpeechTranslationSystem()
            self.system.load_modules()
    
    def _single_file_mode(self):
        """单文件处理模式"""
        self._init_system()
        
        audio_path = input("\n请输入音频文件路径: ").strip()
        if not audio_path:
            print("未输入文件路径")
            return
        
        if not os.path.exists(audio_path):
            print(f"文件不存在: {audio_path}")
            return
        
        self.system.process_audio(audio_path)
    
    def _batch_mode(self):
        """批量处理模式"""
        self._init_system()
        
        print("\n请输入音频文件路径（每行一个，输入空行结束）:")
        paths = []
        while True:
            path = input("  文件路径: ").strip()
            if not path:
                break
            if os.path.exists(path):
                paths.append(path)
            else:
                print(f"  跳过（文件不存在）: {path}")
        
        if paths:
            results = self.system.process_batch(paths)
            success_count = sum(1 for r in results if r['success'])
            print(f"\n批量处理完成: {success_count}/{len(results)} 成功")
        else:
            print("没有有效文件")
    
    def _demo_mode(self):
        """演示模式"""
        self._init_system()
        
        print("\n" + "="*60)
        print("演示模式 - 使用测试样本展示完整流程")
        print("="*60)
        
        # 创建测试样本
        from speech_processing.recognition import create_test_samples
        test_samples = create_test_samples()
        
        # 处理第一个样本
        if test_samples:
            print(f"\n处理演示样本: {test_samples[0]}")
            result = self.system.process_audio(test_samples[0], "demo")
            
            print("\n" + "="*60)
            print("演示完成!")
            print("="*60)
    
    def _config_mode(self):
        """配置模式"""
        print("\n" + "="*60)
        print("系统配置")
        print("="*60)
        
        print("\n语音识别模型:")
        print("  1. tiny (最快，精度较低)")
        print("  2. base (平衡)")
        print("  3. small (较慢，精度较高)")
        print("  4. medium (慢，高精度)")
        
        model_choice = input("\n选择模型 (1-4, 默认2): ").strip()
        model_map = {'1': 'tiny', '2': 'base', '3': 'small', '4': 'medium'}
        model_size = model_map.get(model_choice, 'base')
        
        print("\n合成声音:")
        print("  1. male_us (美式男声)")
        print("  2. female_us (美式女声)")
        print("  3. female_uk (英式女声)")
        print("  4. male_uk (英式男声)")
        
        voice_choice = input("\n选择声音 (1-4, 默认2): ").strip()
        voice_map = {'1': 'male_us', '2': 'female_us', '3': 'female_uk', '4': 'male_uk'}
        voice = voice_map.get(voice_choice, 'female_us')
        
        print("\n合成语速:")
        print("  1. slow (慢速)")
        print("  2. normal (正常)")
        print("  3. fast (快速)")
        
        speed_choice = input("\n选择语速 (1-3, 默认2): ").strip()
        speed_map = {'1': 'slow', '2': 'normal', '3': 'fast'}
        speed = speed_map.get(speed_choice, 'normal')
        
        # 重新初始化系统
        self.system = SpeechTranslationSystem(
            recognition_model=model_size,
            synthesis_voice=voice,
            synthesis_speed=speed
        )
        
        print("\n配置已更新!")


# 主函数
def main():
    """主入口函数"""
    cli = SystemCLI()
    cli.run()


if __name__ == "__main__":
    main()
