# EchoSift

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

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

> Replace the placeholders below with real screenshots before publishing.

![EchoSift Home](link-to-home-screenshot)

![EchoSift Analysis Dashboard](link-to-dashboard-screenshot)

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
- Apple iTunes RSS customer reviews API
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

# Optional: expose /api/reviews in production for debugging
REVIEWS_API_DEBUG_ENABLED=false

# Optional analysis controls
ANALYSIS_MAX_REVIEWS=100
ANALYSIS_REVIEW_TEXT_MAX_CHARS=1200
ANALYSIS_CACHE_TTL_SECONDS=259200
ANALYSIS_CONCURRENCY_LIMIT=2

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
