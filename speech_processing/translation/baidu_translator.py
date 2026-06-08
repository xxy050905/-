"""
中文到英文翻译模块 (Chinese to English Translation)
功能：基于百度翻译开放API实现中译英
支持：命令行交互、批量翻译、翻译质量评估
"""

import os
import hashlib
import random
import requests
from typing import List, Dict, Optional
import warnings
warnings.filterwarnings('ignore')


class ChineseToEnglishTranslator:
    """
    中译英翻译器
    
    使用百度翻译开放API：
    - 接口地址: https://fanyi-api.baidu.com/
    - 免费额度: 每月200万字符
    - 支持语言: 中文->英文
    
    原理说明：
    1. 基于百度自研的神经网络翻译模型(NMT)
    2. 支持上下文感知的端到端翻译
    3. 覆盖多领域、多场景翻译需求
    """
    
    # 百度翻译API地址
    API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
    
    def __init__(self, app_id: str = None, app_key: str = None):
        """
        初始化翻译器
        
        参数:
            app_id: 百度翻译API的App ID
            app_key: 百度翻译API的密钥
        """
        self.app_id = app_id
        self.app_key = app_key
        
        print("翻译模块初始化完成（百度翻译API）")
    
    def translate(self, text: str, from_lang: str = 'zh', to_lang: str = 'en') -> str:
        """
        翻译单条文本
        
        参数:
            text: 输入文本
            from_lang: 源语言 (默认中文 zh)
            to_lang: 目标语言 (默认英文 en)
        返回:
            翻译结果
        """
        if not text or not text.strip():
            return ""
        
        text = text.strip()
        
        # 如果提供了API密钥，使用百度翻译
        if self.app_id and self.app_key:
            try:
                return self._baidu_translate(text, from_lang, to_lang)
            except Exception as e:
                print(f"百度翻译出错: {e}")
        
        # 如果没有密钥，使用备用翻译（拼音直译作为最后手段）
        print("未配置百度翻译API密钥，使用备用翻译")
        return self._fallback_translate(text)
    
    def _baidu_translate(self, text: str, from_lang: str, to_lang: str) -> str:
        """调用百度翻译API"""
        # 生成随机盐值
        salt = str(random.randint(32768, 65536))
        
        # 生成签名: md5(appid + q + salt + 密钥)
        sign_str = self.app_id + text + salt + self.app_key
        sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        # 请求参数
        params = {
            'q': text,
            'from': from_lang,
            'to': to_lang,
            'appid': self.app_id,
            'salt': salt,
            'sign': sign
        }
        
        response = requests.get(self.API_URL, params=params, timeout=10)
        result = response.json()
        
        # 检查错误
        if 'error_code' in result:
            error_msg = result.get('error_msg', 'Unknown error')
            raise Exception(f"百度翻译API错误 {result['error_code']}: {error_msg}")
        
        # 提取翻译结果
        trans_result = result.get('trans_result', [])
        if trans_result:
            return trans_result[0].get('dst', '')
        
        return ""
    
    def _fallback_translate(self, text: str) -> str:
        """备用翻译：直接返回原文（当API不可用时）"""
        return text
    
    def translate_batch(self, texts: List[str], from_lang: str = 'zh', to_lang: str = 'en') -> List[str]:
        """
        批量翻译
        
        参数:
            texts: 输入文本列表
        返回:
            翻译结果列表
        """
        results = []
        for text in texts:
            results.append(self.translate(text, from_lang, to_lang))
        return results
    
    def translate_with_quality(self, text: str) -> Dict:
        """
        翻译并返回质量评估信息
        
        参数:
            text: 中文输入
        返回:
            翻译结果及质量信息
        """
        translated = self.translate(text)
        
        # 简单的质量评估
        quality = self._assess_quality(text, translated)
        
        return {
            'source': text,
            'translation': translated,
            'source_length': len(text),
            'target_length': len(translated),
            'quality': quality
        }
    
    def _assess_quality(self, source: str, target: str) -> Dict:
        """
        简单翻译质量评估
        """
        quality = {
            'score': 1.0,
            'issues': []
        }
        
        # 检查空白
        if not target or not target.strip():
            quality['score'] = 0.0
            quality['issues'].append('翻译结果为空')
        
        # 检查长度比例
        if len(source) > 0 and len(target) > 0:
            ratio = len(target) / len(source)
            if ratio < 0.3 or ratio > 3.0:
                quality['score'] -= 0.2
                quality['issues'].append(f'长度比例异常: {ratio:.2f}')
        
        # 检查是否原文未翻译
        if source.strip() == target.strip():
            quality['score'] = 0.0
            quality['issues'].append('原文未被翻译')
        
        return quality
