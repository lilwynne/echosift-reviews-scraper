<h1 align="center">
  <a href="https://echosift.online/">EchoSift</a>
</h1>

<p align="center">
  <a href="https://echosift.online/">
    <img alt="EchoSift logo" src="./public/readme/echosift-logo.svg" width="88">
  </a>
</p>

<p align="center">
  Lightweight AI feedback analysis for Product Hunt, App Store, and Google Play.
</p>

<p align="center">
  <strong>English</strong> | <a href="./README_CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg">
</p>

## Introduction

EchoSift is a lightweight web app for turning public product feedback into product-ready insights. Paste a Product Hunt, Apple App Store, or Google Play link, and EchoSift fetches recent user comments or reviews, normalizes them, sends the review text through an AI analysis pipeline, and presents sentiment, high-value signals, pain points, feature requests, and representative user voices in a focused dashboard.

This project was built with a Vibe Coding workflow: AI-assisted generation was used to accelerate implementation while keeping the product flow, API behavior, and UI experience grounded in the codebase.

## Features

- 🔗 Analyze Product Hunt, Apple App Store, and Google Play product links.
- 🧹 Normalize comments and reviews into a shared review format across supported sources.
- 🤖 Generate AI-assisted UX and product insights through a SiliconFlow-compatible OpenAI SDK client.
- 📊 Display KPI cards, sentiment distribution, and a current sentiment snapshot with Recharts.
- 🧩 Organize pain points, feature requests, and typical user voices in a priority-style insight board.
- 🧾 Expand insight cards to inspect supporting review evidence from the original scraped data.
- 🌐 Switch the UI between Simplified Chinese, Traditional Chinese, and English.
- 🛡️ Protect the analysis API with URL validation, rate limiting, concurrency limits, request timeouts, and an in-memory analysis cache.

## Screenshots

<p align="center">
  <a href="https://echosift.online/">
    <img alt="EchoSift home page screenshot" src="./public/readme/echosift-home.png">
  </a>
</p>

## Tech Stack

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Recharts

### Backend / API

- Next.js API Routes
- Node.js runtime APIs
- OpenAI JavaScript SDK configured for SiliconFlow
- Product Hunt GraphQL API
- Apple RSS customer reviews API with App Store web page fallback
- `google-play-scraper`

### Database

- No external database is currently used.
- Analysis results are cached in memory with a configurable TTL.
- Rate-limit and concurrency state are also stored in memory, so production deployments with multiple instances should use shared infrastructure if global limits or durable caching are required.

### Testing

- Node.js built-in test runner
- Focused tests for review ingestion, API guards, caching, and AI analysis behavior

## Quick Start

### Prerequisites

- Node.js 18.17 or newer. Node.js 20 LTS is recommended.
- npm
- A SiliconFlow API key for AI analysis.
- A Product Hunt Developer Token if you want to analyze Product Hunt links.

No Python runtime or separate backend service is required. The frontend and API backend live in the same Next.js application.

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required for /api/analyze
SILICONFLOW_API_KEY=sk-your-siliconflow-api-key

# Required only for Product Hunt review/comment ingestion
PRODUCT_HUNT_API_TOKEN=ph-your-product-hunt-developer-token

# Optional review ingestion controls
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=30000
GOOGLE_PLAY_SCRAPER_THROTTLE=10

# Optional: route server-side scraping through a local/system proxy
HTTPS_PROXY=http://localhost:7897

# Optional: expose /api/reviews in production for debugging
REVIEWS_API_DEBUG_ENABLED=false

# Optional analysis controls
ANALYSIS_MAX_REVIEWS=150
ANALYSIS_SELECTED_REVIEW_LIMIT=12
ANALYSIS_REVIEW_TEXT_MAX_CHARS=280
ANALYSIS_CACHE_TTL_SECONDS=259200
ANALYSIS_CONCURRENCY_LIMIT=2

# Required in production for persistent async analysis jobs
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
APP_BASE_URL=https://echosift.online

# Optional web analysis job controls
WEB_ANALYSIS_MAX_REVIEWS=150
WEB_ANALYSIS_SELECTED_REVIEW_LIMIT=12
WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS=280
ANALYSIS_JOB_TTL_MS=1800000
ANALYSIS_JOB_TIMEOUT_MS=120000
AI_ANALYSIS_TIMEOUT_MS=45000
AI_ANALYSIS_MAX_TOKENS=700
GOOGLE_PLAY_WEB_FALLBACK_TIMEOUT_MS=8000

# Optional rate limiting for /api/analyze
ANALYZE_RATE_LIMIT_MAX_REQUESTS=10
ANALYZE_RATE_LIMIT_WINDOW_MS=60000
```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Run the test suite:

```bash
npm test
```

Build and run the production server locally:

```bash
npm run build
npm start
```

## License

This project is licensed under the MIT License.
