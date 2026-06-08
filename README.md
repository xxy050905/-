# 语音翻译系统 (Voice Translator)

> 基于 AI 语音技术的智能翻译平台，提供从语音识别、智能翻译到语音合成的完整服务。

## 功能特性

- **智能语音识别**: 采用 Whisper 深度学习模型，精准识别中文语音
- **精准中英翻译**: 基于百度翻译 API，提供准确流畅的中英翻译
- **自然语音合成**: Edge-TTS 技术生成自然流畅的英文语音
- **实时处理**: 端到端语音处理流程，从录音到翻译输出一气呵成
- **快捷短语**: 保存常用翻译短语，一键播放语音
- **语音词典**: 查询词汇翻译和发音，支持搜索和自定义添加
- **数据可视化**: 翻译量趋势、语速分布、使用时段热力图
- **用户系统**: 注册/登录、个人设置、翻译历史记录

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 状态管理 | Zustand |
| 路由 | React Router v6 |
| Node.js 后端 | Express + sql.js (SQLite) |
| Python 后端 | FastAPI + uvicorn |
| 语音识别 | OpenAI Whisper |
| 语音合成 | Edge-TTS |
| 文本翻译 | 百度翻译 API |
| 图表 | Recharts |

## 快速开始

### 环境要求

- Node.js >= 18
- Python >= 3.10
- 百度翻译 API 密钥（用于翻译功能）

### 安装

1. **克隆项目**

```bash
git clone <repository-url>
cd NLP大作业
```

2. **安装前端依赖**

```bash
npm install
```

3. **安装 Python 依赖**

```bash
pip install -r requirements.txt
```

4. **配置百度翻译 API**

复制 `.env.example` 为 `.env`，填入你的 API 密钥：

```bash
BAIDU_APP_ID=your_app_id_here
BAIDU_APP_KEY=your_app_key_here
```

### 启动

**方式一：一键启动（推荐）**

```bash
start-all.bat
```

这将同时启动前端（端口 5173）和 Python 后端（端口 8001）。

**方式二：分别启动**

```bash
# 终端 1: 启动 Node.js 后端
npm run server

# 终端 2: 启动 Python 后端
python python-api/app/main.py

# 终端 3: 启动前端
npm run dev
```

### 访问

- **前端**: http://localhost:5173
- **API 文档**: http://localhost:8001/docs
- **Node.js 后端**: http://localhost:3001

## 项目结构

```
├── src/                      # 前端源码
│   ├── api/                  # API 客户端
│   ├── components/           # 公共组件 (Layout, Sidebar, Header)
│   ├── pages/                # 页面组件
│   │   ├── Landing.tsx       # 产品首页
│   │   ├── Login.tsx         # 登录
│   │   ├── Register.tsx      # 注册
│   │   ├── Dashboard.tsx     # 仪表盘
│   │   ├── Translate.tsx     # 语音翻译
│   │   ├── History.tsx       # 历史记录
│   │   ├── Phrases.tsx       # 快捷短语
│   │   ├── Dictionary.tsx    # 语音词典
│   │   └── Settings.tsx      # 个人设置
│   ├── store/                # Zustand 状态管理
│   └── types/                # TypeScript 类型定义
├── api/                      # Node.js 后端 (Express)
├── python-api/               # Python 后端 (FastAPI)
├── uploads/                  # 音频文件上传目录
├── data.db                   # SQLite 数据库
├── start-all.bat             # 一键启动脚本
└── start-api.bat             # 启动 API 脚本
```

## 路由说明

| 路由 | 页面 | 认证 |
|------|------|------|
| `/` | 产品首页 (Landing Page) | 无需 |
| `/login` | 登录 | 无需 |
| `/register` | 注册 | 无需 |
| `/dashboard` | 仪表盘 | 需要 |
| `/dashboard/translate` | 语音翻译 | 需要 |
| `/dashboard/history` | 历史记录 | 需要 |
| `/dashboard/phrases` | 快捷短语 | 需要 |
| `/dashboard/dictionary` | 语音词典 | 需要 |
| `/dashboard/settings` | 个人设置 | 需要 |

## API 接口

### Express (端口 3001)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/user/profile` | 获取用户信息 |
| GET | `/api/translations` | 获取翻译列表 |
| POST | `/api/translations` | 创建翻译记录 |
| DELETE | `/api/translations/:id` | 删除翻译记录 |
| GET | `/api/stats` | 获取统计数据 |
| GET | `/api/phrases` | 获取短语列表 |
| POST | `/api/phrases` | 创建短语 |
| DELETE | `/api/phrases/:id` | 删除短语 |
| GET | `/api/dictionary` | 获取词典列表 |
| POST | `/api/dictionary` | 创建词典条目 |
| DELETE | `/api/dictionary/:id` | 删除词典条目 |

### Python FastAPI (端口 8001)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/speech/pipeline` | 完整翻译流程 |
| POST | `/api/speech/recognize` | 语音识别 |
| POST | `/api/speech/synthesize` | 语音合成 |
| POST | `/api/translate` | 文本翻译 |
| GET | `/api/health` | 健康检查 |

## 构建

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

## 预览构建结果

```bash
npm run preview
```

## 许可证

MIT
