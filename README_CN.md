<h1 align="center">
  <a href="https://echosift.online/">EchoSift</a>
</h1>

<p align="center">
  <a href="https://echosift.online/">
    <img alt="EchoSift logo" src="./public/readme/echosift-logo.svg" width="88">
  </a>
</p>

<p align="center">
  轻量筛出 Product Hunt、App Store 和 Google Play 用户评价里的真实信号。
</p>

<p align="center">
  <a href="./README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg">
</p>

## 项目介绍

EchoSift 是一个轻量级 Web 应用，用于把公开产品反馈转化为可用于产品决策的洞察。用户粘贴 Product Hunt、Apple App Store 或 Google Play 链接后，EchoSift 会抓取近期用户评论或评价，进行统一格式化处理，再通过 AI 分析流程提炼情绪、关键高价值信号、高频痛点、功能请求和代表性用户原话，并以聚焦的仪表盘展示。

本项目采用 Vibe Coding 工作流构建：通过 AI 辅助生成加速实现，同时让产品流程、API 行为和界面体验都以当前代码逻辑为准。

## 功能特性

- 🔗 支持分析 Product Hunt、Apple App Store 和 Google Play 产品链接。
- 🧹 将不同来源的评论和评价统一规范化为共享的评论数据结构。
- 🤖 通过兼容 SiliconFlow 的 OpenAI SDK 客户端生成 AI 辅助的 UX 与产品洞察。
- 📊 使用 Recharts 展示 KPI 卡片、情绪分布和当前情绪快照。
- 🧩 以优先级看板形式组织痛点、功能请求和典型用户声音。
- 🧾 支持展开洞察卡片，查看来自原始抓取数据的支撑评论证据。
- 🌐 支持在简体中文、繁体中文和英文界面之间切换。
- 🛡️ 为分析 API 提供 URL 校验、频率限制、并发限制、请求超时和内存分析缓存。

## 截图

<p align="center">
  <a href="https://echosift.online/">
    <img alt="EchoSift 首页截图" src="./public/readme/echosift-home.png">
  </a>
</p>

## 技术栈

### 前端

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Recharts

### 后端 / API

- Next.js API Routes
- Node.js runtime APIs
- 面向 SiliconFlow 配置的 OpenAI JavaScript SDK
- Product Hunt GraphQL API
- Apple RSS customer reviews API 与 App Store 网页评论 fallback
- `google-play-scraper`

### 数据库

- 当前未使用外部数据库。
- 分析结果通过可配置 TTL 的内存缓存保存。
- 频率限制和并发状态同样保存在内存中，因此多实例生产部署若需要全局限制或持久缓存，建议接入共享基础设施。

### 测试

- Node.js 内置测试运行器
- 针对评论抓取、API 防护、缓存和 AI 分析行为的聚焦测试

## 快速开始

### 前置要求

- Node.js 18.17 或更新版本。推荐使用 Node.js 20 LTS。
- npm
- 用于 AI 分析的 SiliconFlow API Key。
- 如果需要分析 Product Hunt 链接，需要 Product Hunt Developer Token。

本项目不需要 Python 运行时，也不需要单独启动后端服务。前端和 API 后端都位于同一个 Next.js 应用中。

### 安装

```bash
npm install
```

### 环境变量

在项目根目录创建 `.env.local` 文件：

```env
# /api/analyze 必需
SILICONFLOW_API_KEY=sk-your-siliconflow-api-key

# 仅 Product Hunt 评论/留言抓取必需
PRODUCT_HUNT_API_TOKEN=ph-your-product-hunt-developer-token

# 可选：评论抓取控制
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=30000
GOOGLE_PLAY_SCRAPER_THROTTLE=10

# 可选：让服务端抓取走本地/系统代理
HTTPS_PROXY=http://localhost:7897

# 可选：在生产环境开放 /api/reviews 调试接口
REVIEWS_API_DEBUG_ENABLED=false

# 可选：分析控制
ANALYSIS_MAX_REVIEWS=50
ANALYSIS_REVIEW_TEXT_MAX_CHARS=1200
ANALYSIS_CACHE_TTL_SECONDS=259200
ANALYSIS_CONCURRENCY_LIMIT=2

# 可选：网页版异步分析任务控制
WEB_ANALYSIS_MAX_REVIEWS=50
WEB_ANALYSIS_SELECTED_REVIEW_LIMIT=24
WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS=500
ANALYSIS_JOB_TTL_MS=1800000
ANALYSIS_JOB_TIMEOUT_MS=45000
AI_ANALYSIS_TIMEOUT_MS=30000

# 可选：/api/analyze 频率限制
ANALYZE_RATE_LIMIT_MAX_REQUESTS=10
ANALYZE_RATE_LIMIT_WINDOW_MS=60000
```

### 本地运行

启动开发服务器：

```bash
npm run dev
```

打开应用：

```text
http://localhost:3000
```

运行测试：

```bash
npm test
```

本地构建并运行生产服务器：

```bash
npm run build
npm start
```

## 许可证

本项目基于 MIT License 授权。
