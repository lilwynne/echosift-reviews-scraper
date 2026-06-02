# AI Handoff: EchoSift MVP

## Current Status

EchoSift is a Next.js App Router MVP prototype for turning product review URLs into an AI-generated feature insight dashboard.

The frontend prototype and UI are considered confirmed by the user. Important constraint for future work:

- Do not modify existing UI styles, Tailwind class names, or component layout unless the user explicitly asks.
- Recent backend work implemented server-side review ingestion and API routes. The Product Hunt path now uses the official Product Hunt API v2 GraphQL endpoint.
- Latest backend work added SiliconFlow/OpenAI-compatible AI analysis via `lib/ai-analysis.ts`. The `/api/analyze` route now returns the raw AI analysis schema under `analysis` instead of mock dashboard fields.
- Latest frontend work wires the homepage analysis form to `POST /api/analyze` and renders the returned `analysis` schema in the Dashboard instead of mock result data.
- Latest evidence work returns normalized real review snippets from `/api/analyze` and maps dashboard evidence buttons to those snippets. The AI only returns review indexes; the backend resolves those indexes against the fetched reviews before responding.
- Latest ingestion fix supports App Store URLs without an embedded `id{APP_ID}` segment, such as `https://apps.apple.com/cn/app/soul/`, by resolving the app slug through Apple Search before fetching Apple RSS reviews.
- Latest App Store ingestion work keeps Apple RSS as the first source, tries `mostrecent` then `mosthelpful`, scans sparse primary-country RSS pages even when earlier pages are empty, retries empty terminal pages, and only falls back to parsing the App Store product page's `serialized-server-data` reviews when RSS yields no usable review bodies.
- Latest empty-review performance fix makes `/api/analyze` return the standard empty analysis result immediately when ingestion returns zero reviews, instead of spending an AI request on empty input.
- Latest reliability work moved production web jobs to Upstash Redis + QStash. `POST /api/analyze/jobs` stores durable job state, QStash calls `/api/analyze/jobs/run`, and `GET /api/analyze/jobs/{jobId}` reads the durable job/result record.
- Latest AI performance work changed the model output to a lightweight insight draft. Backend code now computes sentiment metrics, scores, typical voices, and evidence locally; AI timeout or invalid JSON falls back to deterministic analysis instead of failing a non-empty job.
- Latest Product Hunt analysis fix handles unrated GraphQL comments with local text-based sentiment heuristics. App Store and Google Play still use rating-based sentiment. Product Hunt typical voices now prioritize ordinary user comments over maker/founder-style launch comments and cap the influence of long text/high votes.
- Defaults now send 12 selected high-value reviews at 280 chars each, with `AI_ANALYSIS_TIMEOUT_MS=45000`, `AI_ANALYSIS_MAX_TOKENS=700`, and `ANALYSIS_JOB_TIMEOUT_MS=120000`.
- Local Google Play reliability now also depends on proxy-aware backend requests: the desktop launcher exports the macOS HTTPS proxy when present, and `lib/reviews.ts` falls back to `google-play-web-page` first-page review parsing when the scraper endpoint fails.
- Latest extension performance work removed the content script's full-body MutationObserver and 500ms polling, added event-driven SPA URL detection, background in-flight request dedupe, session-memory success caching, and moved extension requests to the async job API with a 120-second timeout.
- The old Product Hunt crawler/deployment path has been removed from this repo. There is no Apify actor directory, actor deploy script, or actor GitHub workflow left in the project.
- Latest repository hygiene work added commented `.gitignore` sections and ignores local cache/tool output folders such as `.echosift/`, `.playwright-cli/`, `.cache/`, and `.npm-cache/`. `.echosift/` and `.playwright-cli/` were removed from the Git index with `git rm --cached`, so existing local files remain on disk but future pushes should not include them.

The local dev server was last started with:

```bash
npm run dev -- -H 127.0.0.1 -p 3000
```

Local URL:

```text
http://127.0.0.1:3000
```

## Project Stack

- Next.js 14.2.35 with App Router
- React 18
- Tailwind CSS
- Framer Motion
- lucide-react
- openai npm package
- recharts
- TypeScript

## Key Product/UI Decisions Already Made

- Product name is `EchoSift`.
- UI language options:
  - `zh-CN`: 简体中文
  - `zh-TW`: 繁體中文
  - `en`: English
- The frontend now exposes a single free analysis mode. No model picker or paid tier is rendered.
- Site is dark mode with cold blue/cyan gradient background.
- Header contains logo, free-mode badge, and language selector.
- Login, signup, model picker, and subscription UI were removed from the rendered page.
- No competitor or reference product names should appear in visible copy.
- Dashboard now consumes real `analysis` data returned by `/api/analyze`; `lib/mock-data.ts` still provides localization, labels, icons, and non-result marketing/preview copy.
- The hero's "Real-time Insight Preview" now has a three-state interaction flow:
  - idle placeholder card
  - scanning overlay with a soft dark glass mask and looping scan line
  - result reveal with spring cards, count-up metric, spring width bars, and hover spotlight

## Important Files

- `app/page.tsx`
  - Main single-page frontend state.
  - Uses `localizedContent[language]`.
  - Calls `POST /api/analyze` with `{ url, language }`, tracks `inputText`, `isLoading`, `error`, and `analysisData`, and renders loading, error, or real dashboard states.
- `lib/mock-data.ts`
  - Product/localization data.
  - Dashboard localization/icon source of truth, but not the source of analysis result values.
  - Contains lucide icon component references in the frontend mock data.
- `lib/analysis-types.ts`
  - Shared frontend types for `AnalysisResult`, `AnalyzeApiResponse`, real review snippets, and evidence mappings.
- `components/Dashboard.tsx`
  - Receives the full analyze response and passes `analysis`, `reviews`, and `evidence` into dashboard subcomponents.
- `components/KpiCards.tsx`
  - Renders KPI cards from `analysis.insightPreview` and `analysis.coreMetrics`.
- `components/SentimentChart.tsx`
  - Renders the pie and single-result trend chart from `analysis.emotionDistribution`.
- `components/PriorityKanban.tsx`
  - Renders pain points, feature requests, and typical voices from `analysis.deepInsights` and `analysis.typicalVoices`.
  - Evidence buttons expand inline inside each card and show real normalized review snippets from `/api/analyze`.
- `app/api/analyze/route.ts`
  - Backend API route for analysis.
  - Validates URL/language, then calls the shared analysis pipeline with the synchronous analysis defaults.
  - Logs `[ANALYZE_TIMING]` with scrape and analysis durations for backend performance debugging.
  - Returns `analysis` with the raw SiliconFlow model result. It no longer returns `dashboard`, `kpis`, `sentiment`, `trendData`, or `kanban`.
- `app/api/analyze/jobs/`
  - Async analysis job API used by the homepage and Chrome extension.
  - `POST /api/analyze/jobs` creates or reuses a durable job and returns `{ jobId, status }`.
  - `GET /api/analyze/jobs/{jobId}` returns queued/scraping/analyzing/completed/failed state and includes `result` once completed.
  - `POST /api/analyze/jobs/run` is the internal QStash-signed worker route.
  - Successful non-empty job results are cached in Redis for production jobs.
- `lib/analyze-pipeline.ts`
  - Shared scrape + AI analysis pipeline used by synchronous `/api/analyze` and webpage jobs.
  - Handles normalized review evidence, lightweight AI prompt formatting, empty-review short-circuiting, local metric/evidence composition, and deterministic fallback when AI fails.
  - Product Hunt comments have no rating, so this file infers their sentiment from text; do not change unrated Product Hunt comments back to default neutral.
- `lib/analyze-jobs.ts`
  - Production uses Upstash Redis for job/result/cache state and QStash for worker delivery; local/test falls back to the in-memory adapter.
  - Web job defaults: `WEB_ANALYSIS_MAX_REVIEWS=150`, `WEB_ANALYSIS_SELECTED_REVIEW_LIMIT=12`, `WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS=280`, `ANALYSIS_JOB_TIMEOUT_MS=120000`, `AI_ANALYSIS_TIMEOUT_MS=45000`.
  - Reuses the existing process-level analysis concurrency slot before executing the background job.
- `app/api/reviews/route.ts`
  - Backend API route for testing raw review ingestion.
- `extension/`
  - Chrome extension package. The content script injects the floating analyze button on supported product pages, and `background.ts` owns API calls, in-flight dedupe, success caching, and timeout-aware responses.
  - The root `tsconfig.json` excludes this package; validate it with `cd extension && npx tsc --noEmit` and build it with `cd extension && npm run build`.
- `.gitignore`
  - Ignores dependencies, build output, local environment files, package-manager logs, macOS metadata, and local cache/tool output folders including `.echosift/` and `.playwright-cli/`.
- `lib/ai-analysis.ts`
  - SiliconFlow/OpenAI-compatible analysis helper.
  - Exports `analyzeFeedback(reviewsText, modelType)`.
  - Default model is `deepseek-ai/DeepSeek-V4-Flash`.
  - Uses `response_format: { type: "json_object" }` and parses model output with `JSON.parse`.
- `lib/reviews.ts`
  - Server-side multi-source review ingestion helper.
  - Product Hunt uses official GraphQL, App Store uses Apple Search plus Apple RSS with sort/country/page fallbacks before App Store web-page parsing, and Google Play uses `google-play-scraper`.
- `lib/api-errors.ts`
  - Shared review-ingestion error-code to HTTP-status mapping.
- `scripts/test-review-ingestion.mjs`
  - Local unit tests for Product Hunt GraphQL review ingestion helper behavior.
- `scripts/test-ai-analysis.mjs`
  - Local unit tests for the SiliconFlow analysis helper, using a mock client factory.
- `scripts/test-reviews.mjs`
  - Local smoke-test script that calls `POST /api/reviews` on a running dev server.

## AI Analysis

Helper:

```text
lib/ai-analysis.ts
```

Public function:

```ts
analyzeFeedback(reviewsText: string, modelType = "deepseek-ai/DeepSeek-V4-Flash")
```

SiliconFlow client config:

```ts
new OpenAI({
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY
})
```

Required local environment variable in `.env.local`:

```env
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

Implementation details:

- Uses the official `openai` npm package.
- Sends the UX/product-manager system prompt as the `system` message.
- Sends formatted review text as the `user` message.
- Forces JSON mode with `response_format: { type: "json_object" }`.
- Parses `choices[0].message.content` with `JSON.parse()` and returns the JavaScript object directly.
- The prompt asks the AI to return review index arrays for pain points, feature requests, and typical voices. These indexes refer to the numbered `#1`, `#2`, `#3` review blocks in the user message.
- On missing API key, API failure, empty content, or parse failure, logs full context with `console.error("[AI_ANALYSIS_FAILED]", ...)` and throws `new Error("AI_ANALYSIS_FAILED")`.

Analyze response includes:

- `sourceUrl`
- `language`
- `scrapeSource`
- `reviewCount`
- `reviews` with normalized real review snippets, not provider raw items
- `evidence` mapping dashboard cards to review snippet ids
- `analysis.insightPreview`
- `analysis.coreMetrics`
- `analysis.emotionDistribution`
- `analysis.deepInsights`
- `analysis.typicalVoices`

## API Routes

Analyze endpoint:

```text
POST /api/analyze
```

Request body:

```json
{
  "url": "https://www.producthunt.com/products/example-product",
  "language": "zh-CN"
}
```

Validation:

- `url` must be a non-empty valid `http:` or `https:` URL.
- `language` must be one of `zh-CN`, `zh-TW`, `en`.

Success response shape:

```json
{
  "sourceUrl": "https://example.com/app",
  "language": "zh-CN",
  "scrapeSource": "app-store",
  "reviewCount": 100,
  "reviews": [
    {
      "snippetId": "app-store:review-1:1",
      "reviewIndex": 1,
      "id": "review-1",
      "source": "app-store",
      "sourceUrl": "https://example.com/review-1",
      "productName": "Example App",
      "title": "Useful update",
      "text": "The original review text.",
      "author": "Ada",
      "authorUsername": "ada",
      "rating": 5,
      "date": "2026-05-26T00:00:00Z",
      "votes": 3
    }
  ],
  "evidence": {
    "painPoints": [["app-store:review-1:1"]],
    "featureRequests": [["app-store:review-1:1"]],
    "typicalVoices": {
      "positive": ["app-store:review-1:1"],
      "neutral": ["app-store:review-1:1"],
      "negative": ["app-store:review-1:1"]
    }
  },
  "analysis": {
    "insightPreview": {},
    "coreMetrics": {},
    "emotionDistribution": {},
    "deepInsights": {},
    "typicalVoices": {}
  }
}
```

Failure behavior:

- Scraping failures are mapped through `statusFromScrapeErrorCode`.
- AI analysis failures return HTTP `502`:

```json
{
  "error": {
    "code": "AI_ANALYSIS_FAILED",
    "message": "AI 分析服务暂时不可用，请稍后重试。"
  }
}
```

Review ingestion endpoint:

```text
POST /api/reviews
```

Request body:

```json
{
  "url": "https://www.producthunt.com/products/example-product"
}
```

Web analysis job endpoints:

```text
POST /api/analyze/jobs
GET /api/analyze/jobs/{jobId}
```

Create request body:

```json
{
  "url": "https://apps.apple.com/cn/app/example/id123456789",
  "language": "zh-CN"
}
```

Job response shape:

```json
{
  "jobId": "7e9f8c6b-6a7a-4a01-85e2-5e0b01af8b4f",
  "status": "analyzing",
  "createdAt": "2026-05-30T00:00:00.000Z",
  "updatedAt": "2026-05-30T00:00:03.000Z",
  "elapsedMs": 3000
}
```

Completed jobs include the existing `AnalyzeApiResponse` under `result`; failed jobs include `{ code, message, status }` under `error`.

## Review Ingestion

Supported sources:

- Product Hunt URLs on `producthunt.com`
- Apple App Store URLs on `apps.apple.com`
- Google Play URLs on `play.google.com/store/apps/details`

Required backend variables:

```env
PRODUCT_HUNT_API_TOKEN=your_product_hunt_developer_token
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

Optional environment variables:

```env
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=30000
ANALYSIS_MAX_REVIEWS=150
ANALYSIS_SELECTED_REVIEW_LIMIT=12
ANALYSIS_REVIEW_TEXT_MAX_CHARS=280
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
APP_BASE_URL=https://echosift.online
WEB_ANALYSIS_MAX_REVIEWS=150
WEB_ANALYSIS_SELECTED_REVIEW_LIMIT=12
WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS=280
ANALYSIS_JOB_TTL_MS=1800000
ANALYSIS_JOB_TIMEOUT_MS=120000
AI_ANALYSIS_TIMEOUT_MS=45000
AI_ANALYSIS_MAX_TOKENS=700
GOOGLE_PLAY_WEB_FALLBACK_TIMEOUT_MS=8000
```

Implementation details:

- Product Hunt uses the official Product Hunt API v2 GraphQL endpoint:
  `https://api.producthunt.com/v2/api/graphql`.
- The public API still accepts a Product Hunt URL. Backend code parses `/products/{slug}` from the URL and calls `post(slug: $slug)`.
- Product Hunt GraphQL query fetches product metadata (`name`, `tagline`, `votesCount`, counts/ratings metadata) and paginated `comments(first:, after:, order: NEWEST)`.
- Pagination uses `pageInfo.hasNextPage` and `pageInfo.endCursor`, looping until all available comments are fetched or the active max review count is reached.
- Public helper signature is `fetchReviews(url, options?)`, where `options.maxReviews` can override the default `REVIEWS_MAX_REVIEWS` for a single call. Existing `fetchReviews(url)` calls still use `REVIEWS_MAX_REVIEWS`.
- `/api/reviews` intentionally keeps the default ingestion behavior and does not pass `maxReviews`.
- `/api/analyze` passes `ANALYSIS_MAX_REVIEWS`; the default fetched evidence pool is 150 reviews/comments while the AI prompt still uses the selected-review cap.
- Web jobs pass `WEB_ANALYSIS_MAX_REVIEWS` and then select at most `WEB_ANALYSIS_SELECTED_REVIEW_LIMIT` reviews for the AI prompt. The response still returns the full fetched evidence pool, capped by `WEB_ANALYSIS_MAX_REVIEWS`.
- Normalized Product Hunt comments include `text`, `author`, `authorUsername`, `date`, `votes`, `productName`, and `sourceUrl`.
- Product Hunt response includes `provider: "product-hunt-graphql"` and a `product` metadata object.
- App Store uses Apple public RSS first:
  `https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={appId}/sortby={sort}/json`
- RSS sort order is `mostrecent` first, then `mosthelpful`. This matters for apps where `mostrecent` is empty but `mosthelpful` still returns review bodies, such as `id6738571698`.
- RSS country order is the URL country first, then `us`, `cn`, `jp`, `gb`, `ca`, and `au`, with review dedupe across countries and sorts.
- Primary-country RSS scanning does not stop just because page 1 or page 2 is empty. It scans up to the active page limit and retries an empty terminal primary page up to 4 times because Apple can return `0` and then return review bodies for the same RSS page on a later request.
- App Store URLs may include an explicit app id, for example `https://apps.apple.com/{country}/app/.../id{APP_ID}`, or a slug-only path such as `https://apps.apple.com/cn/app/soul/`.
- For slug-only App Store URLs, `lib/reviews.ts` calls Apple Search:
  `https://itunes.apple.com/search?term={slug}&country={country}&entity=software&limit=1`
  and uses the returned `trackId` as the RSS `{appId}`.
- If Apple RSS returns no usable review bodies across the configured country/sort/page attempts, App Store falls back to fetching the original product page and parsing `<script id="serialized-server-data" type="application/json">`.
- The web fallback extracts `Review` records from `shelfMapping.allProductReviews.items[*].review` and `shelfMapping.userProductReviews.items[*].review`, dedupes by review id, and returns `provider: "apple-web-page"`.
- Web fallback review fields map `id`, `title`, `contents`, `rating`, `reviewerName`, and `date` into the shared `NormalizedReview` shape.
- App Store product pages commonly embed only a small visible review sample, often around 8 items. A large ratings count is not the same thing as a large set of available review bodies, so `scrapeProvider: "apple-web-page"` plus `reviewCount: 8` means RSS did not produce usable reviews and the backend returned only the product-page embedded sample.
- Google Play uses the `google-play-scraper` npm package.
- `REVIEWS_MAX_REVIEWS` defaults to 100.
- Request timeout uses local `AbortController`, default 30 seconds.
- Returns friendly JSON errors for missing Product Hunt token, unsupported source, scraping failures, timeout, and network errors.

## Performance Notes

- Product Hunt analysis was slow because `/api/analyze` waited for full review ingestion and then sent every fetched review body to the AI provider.
- The current optimization keeps response shape and UI untouched while limiting AI prompt size:
  - `ANALYSIS_MAX_REVIEWS=150` raises the fetched evidence pool beyond the old 50-item cap.
  - `ANALYSIS_SELECTED_REVIEW_LIMIT=12` and `ANALYSIS_REVIEW_TEXT_MAX_CHARS=280` cap the synchronous compatibility prompt.
  - `[ANALYZE_TIMING]` server logs expose scrape, analysis, and total durations.
- The webpage now uses async jobs for better perceived latency and larger evidence collection:
  - The browser submits `POST /api/analyze/jobs`, then polls `GET /api/analyze/jobs/{jobId}` every 1.5 seconds.
  - Status maps to existing loading UI steps: queued/scraping, analyzing, completed.
  - Jobs default to fetching 150 reviews, selecting 12 high-value reviews for AI, and trimming each selected review to 280 characters.
  - Selection favors reviews with ratings, longer text, pain/request keywords, votes, and recency.
  - AI returns only a lightweight insight draft; metrics, typical voices, and evidence IDs are built locally from the full `reviews` evidence pool.
- Product Hunt sentiment distribution is local and text-based because official GraphQL comments do not include per-comment ratings. Clear praise, usefulness, congratulations, excitement, issues, missing capabilities, attribution concerns, and data transparency concerns should not collapse into neutral.
- Product Hunt typical voice ranking should prefer ordinary users over maker/founder-style launch comments. Long text and high votes are capped so they cannot dominate representative user voice selection.
- Analysis cache keys now use `analysis:v5` and include normalized URL, language, max review count, selected review limit, review text character cap, and model type. The Chrome extension session cache prefix is `analysis:v4`. A backend deploy is required to clear stale server-side results; redeploying only the extension cannot fix an old cached `apple-web-page` 8-review response from `echosift.online`.
- `scripts/test-review-ingestion.mjs` covers the `maxReviews` override and verifies Product Hunt stops pagination when the requested limit is reached.
- App Store ingestion tests cover RSS-first behavior, `mostrecent` to `mosthelpful` sort fallback, sparse primary-page scanning with empty-page retries, RSS-empty web fallback parsing, and missing `serialized-server-data` returning an empty result without throwing.
- `scripts/test-analyze-route.mjs` covers the zero-review `/api/analyze` short-circuit path, job completion, worker execution, cache-hit jobs, failed jobs, configured review ingestion, 12-review AI selection, AI fallback, job timeout, and local evidence mapping.

Error response format:

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "请输入有效的产品链接。"
  }
}
```

Other error codes currently implemented:

- `INVALID_JSON`
- `INVALID_LANGUAGE`
- `INVALID_REVIEW_SOURCE_URL`
- `AI_ANALYSIS_FAILED`
- `MISSING_PRODUCT_HUNT_API_TOKEN`
- `UNSUPPORTED_REVIEW_SOURCE`
- `REVIEW_FETCH_TIMEOUT`
- `REVIEW_FETCH_NETWORK_ERROR`
- `REVIEW_FETCH_FAILED`

## Current Cleanup

Completed in the latest cleanup:

- Removed `actors/product-hunt-reviews/`.
- Removed `.github/workflows/deploy-product-hunt-actor.yml`.
- Removed `scripts/deploy-product-hunt-actor.mjs`.
- Removed root `actor:*` npm scripts.
- Renamed the active ingestion helper from `lib/apify-reviews.ts` to `lib/reviews.ts`.
- Renamed the helper test script from `scripts/test-apify-reviews.mjs` to `scripts/test-review-ingestion.mjs`.
- Removed obsolete actor-related response fields, error-code mappings, environment-variable fallbacks, and loading copy references.

## Earlier Major Frontend Files Created/Modified

These existed before the backend cleanup and should be treated as user-approved UI:

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `tailwind.config.ts`
- `lib/mock-data.ts`
- `components/Header.tsx`
- `components/HeroAnalyzer.tsx`
- `components/InsightPreview.tsx`
- `components/ProductShowcase.tsx`
- `components/UseCases.tsx`
- `components/EchoSiftLogo.tsx`
- `components/Dashboard.tsx`
- `components/KpiCards.tsx`
- `components/SentimentChart.tsx`
- `components/PriorityKanban.tsx`
- `components/LoadingState.tsx`

`components/AuthModal.tsx` and `components/SubscriptionPanel.tsx` were removed.

## Latest Frontend Update

- Wired the homepage form in `app/page.tsx` to the real `POST /api/analyze` route:
  - Request body is `{ url: inputText.trim(), language }`.
  - `isLoading` shows the existing `LoadingState` while the request is in flight.
  - Backend error responses are surfaced through a friendly error panel.
  - Successful responses are stored as `analysisData`; Dashboard reads result values from `analysisData.analysis`.
- Updated Dashboard subcomponents to consume the raw analysis schema:
  - KPI cards bind to `insightPreview` and `coreMetrics`.
  - Sentiment charts bind to `emotionDistribution`.
  - Priority kanban binds to `deepInsights` and `typicalVoices`.
- Added `lib/analysis-types.ts` for shared frontend response types.
- Replaced the old static preview panel inside `components/HeroAnalyzer.tsx` with `components/InsightPreview.tsx`.
- Added Framer Motion spring-driven micro-interactions for:
  - looping scan line
  - result-card entrance
  - count-up metric reveal
  - progress bar width growth
  - hover spotlight glow
- Added localized preview data in `lib/mock-data.ts` for the three insight cards and metric.
- Verified locally with `npm run lint`, `npm run build`, and browser screenshots on `http://127.0.0.1:3000`.

## Latest Backend Update

- Added `openai` dependency.
- Added `lib/ai-analysis.ts` with the SiliconFlow-compatible `analyzeFeedback(...)` helper.
- Updated `app/api/analyze/route.ts` so it calls real AI analysis after scraping.
- Added `scripts/test-ai-analysis.mjs`.
- Updated `package.json` scripts:
  - `test`
  - `test:review-ingestion`
  - `test:ai-analysis`
- User configured `.env.local`; the last clean dev start detected `Environments: .env.local`.
- A local 404 was caused by stale/broken `.next` cache missing the homepage server artifact. Fix was:

```bash
rm -rf .next
npm run dev -- -H 127.0.0.1 -p 3000
```

After restart, `curl -I http://127.0.0.1:3000/` returned `HTTP/1.1 200 OK`.

## Latest Ingestion Fix

Issue observed on 2026-05-26:

- User submitted `https://apps.apple.com/cn/app/soul/` through the homepage analyzer.
- Browser DevTools showed `POST /api/analyze` returning HTTP `502 Bad Gateway`.
- Root cause: App Store parsing only accepted URLs containing `/id{APP_ID}`. The slug-only App Store path was reported as `REVIEW_FETCH_FAILED`, and `statusFromScrapeErrorCode` mapped that class to 502.

Fix:

- `lib/reviews.ts` now extracts an App Store slug from `/app/{slug}` when no app id is present.
- `fetchAppStoreReviews` resolves slug-only links through Apple Search, then fetches Apple RSS reviews with the resolved `trackId`.
- Missing platform identifiers now return `INVALID_REVIEW_SOURCE_URL`.
- `lib/api-errors.ts` maps `INVALID_REVIEW_SOURCE_URL` to HTTP 400, so invalid source links no longer masquerade as upstream 502 failures.

Validation after the fix:

```bash
npm run test:review-ingestion
npm test
npm run build
```

Notes:

- The local dev server could not be started in the prior sandbox due to `listen EPERM: operation not permitted 0.0.0.0:3000`, so browser-level live verification was not completed in that run.
- Unit coverage was added for `https://apps.apple.com/cn/app/soul/`, confirming the flow calls Apple Search first and then Apple RSS.

## Test Results

Latest successful checks after the web analysis job performance update:

```bash
npm test
npm run test:api-guards
npm run test:analyze-route
npm run test:ai-analysis
npm run test:review-ingestion
npm run lint
npm run build
```

Latest build output includes:

```text
ƒ /api/analyze
ƒ /api/analyze/jobs
ƒ /api/analyze/jobs/[jobId]
ƒ /api/reviews
```

Product Hunt helper tests cover:

- Official GraphQL bearer-token usage.
- URL slug parsing.
- Comment normalization.
- `pageInfo.endCursor` pagination.
- Missing `PRODUCT_HUNT_API_TOKEN` error behavior.

Product Hunt analyze-route tests also cover:

- Unrated Product Hunt comments producing non-zero positive sentiment when praise/usefulness is present.
- Unrated Product Hunt comments producing non-zero negative sentiment when attribution/data transparency concerns are present.
- Typical voices selecting an ordinary user comment instead of a longer, higher-vote maker/founder comment.

Review ingestion tests also cover:

- App Store slug-only URL resolution through Apple Search before RSS fetching.
- App Store RSS `mostrecent` to `mosthelpful` sort fallback.
- App Store sparse primary-page scanning and empty terminal-page retries.
- Invalid App Store source URLs returning `INVALID_REVIEW_SOURCE_URL` with HTTP 400 mapping.

AI analysis helper tests cover:

- SiliconFlow base URL and API key wiring.
- Default model `deepseek-ai/DeepSeek-V4-Flash`.
- `response_format: { type: "json_object" }`.
- Custom `modelType` override.
- Successful JSON parsing.
- API failure, invalid JSON, and missing API key normalization to `AI_ANALYSIS_FAILED`.

## Known Constraints

- Network access may require local proxy/approval for package installs or live source tests.
- Starting Next dev server may require escalation if the sandbox blocks local port listening.
- Do not run destructive git commands.
- Product Hunt backend calls require a valid `PRODUCT_HUNT_API_TOKEN` in backend `.env.local`.
- SiliconFlow analysis requires a valid `SILICONFLOW_API_KEY` in backend `.env.local`.
- App Store slug-only links depend on Apple Search returning the intended first software result for the extracted slug and country.
- App Store RSS may return an empty feed for some app/country/sort/page combinations and can be inconsistent across retries. The backend tries sort, country, sparse-page, and retry fallbacks before product-page parsing, but the final `apple-web-page` fallback only uses comments embedded in the public page HTML and does not paginate every App Store review.
- If production returns `scrapeProvider: "apple-web-page"` with about 8 App Store reviews after this fix, check that the backend was redeployed and that the server cache key is `analysis:v5`; extension-only deploys still read server results produced by the deployed backend.
- Google Play scraping depends on public Google Play network availability and may timeout in restricted networks.
- `POST /api/analyze` depends on scraping before model analysis. Product Hunt without `PRODUCT_HUNT_API_TOKEN` returns `MISSING_PRODUCT_HUNT_API_TOKEN`.
- The frontend now consumes `/api/analyze`; real end-to-end tests require network access plus a valid `SILICONFLOW_API_KEY`, and Product Hunt tests also require `PRODUCT_HUNT_API_TOKEN`.
- If `/` unexpectedly returns 404 while `app/page.tsx` exists, reset the generated Next cache with `rm -rf .next` and restart the dev server from the project root.

## Recommended Next Steps

1. Add API-route tests for `/api/analyze` success and `AI_ANALYSIS_FAILED` behavior beyond the zero-review short-circuit test.
2. Run live smoke tests against App Store, Google Play, and Product Hunt URLs with both required API keys present.
3. Consider adding browser-level tests for empty input, invalid URL, loading, error, and successful dashboard rendering states.
