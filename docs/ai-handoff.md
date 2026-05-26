# AI Handoff: EchoSift MVP

## Current Status

EchoSift is a Next.js App Router MVP prototype for turning product review URLs into an AI-generated feature insight dashboard.

The frontend prototype and UI are considered confirmed by the user. Important constraint for future work:

- Do not modify existing UI styles, Tailwind class names, or component layout unless the user explicitly asks.
- Recent backend work implemented server-side review ingestion and API routes. The Product Hunt path now uses the official Product Hunt API v2 GraphQL endpoint.
- Latest backend work added SiliconFlow/OpenAI-compatible AI analysis via `lib/ai-analysis.ts`. The `/api/analyze` route now returns the raw AI analysis schema under `analysis` instead of mock dashboard fields.
- Latest frontend work wires the homepage analysis form to `POST /api/analyze` and renders the returned `analysis` schema in the Dashboard instead of mock result data.
- Latest ingestion fix supports App Store URLs without an embedded `id{APP_ID}` segment, such as `https://apps.apple.com/cn/app/soul/`, by resolving the app slug through Apple Search before fetching Apple RSS reviews.
- Latest performance work optimized Product Hunt analysis latency. The slow path was `/api/analyze` fetching up to `REVIEWS_MAX_REVIEWS=100` comments before sending the full comment text to AI. `/api/analyze` now uses the analysis-specific `ANALYSIS_MAX_REVIEWS` default of 50 and trims each review text to `ANALYSIS_REVIEW_TEXT_MAX_CHARS` default of 1200 characters before calling SiliconFlow.
- The old Product Hunt crawler/deployment path has been removed from this repo. There is no Apify actor directory, actor deploy script, or actor GitHub workflow left in the project.

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
  - Shared frontend types for `AnalysisResult` and `AnalyzeApiResponse`.
- `components/Dashboard.tsx`
  - Receives the full analyze response and passes `analysis` into dashboard subcomponents.
- `components/KpiCards.tsx`
  - Renders KPI cards from `analysis.insightPreview` and `analysis.coreMetrics`.
- `components/SentimentChart.tsx`
  - Renders the pie and single-result trend chart from `analysis.emotionDistribution`.
- `components/PriorityKanban.tsx`
  - Renders pain points, feature requests, and typical voices from `analysis.deepInsights` and `analysis.typicalVoices`.
- `app/api/analyze/route.ts`
  - Backend API route for analysis.
  - Validates URL/language, calls `fetchReviews(url, { maxReviews })` with the analysis-specific max review count, formats normalized reviews as capped text, then calls `analyzeFeedback(...)`.
  - Logs `[ANALYZE_TIMING]` with scrape and analysis durations for backend performance debugging.
  - Returns `analysis` with the raw SiliconFlow model result. It no longer returns `dashboard`, `kpis`, `sentiment`, `trendData`, or `kanban`.
- `app/api/reviews/route.ts`
  - Backend API route for testing raw review ingestion.
- `lib/ai-analysis.ts`
  - SiliconFlow/OpenAI-compatible analysis helper.
  - Exports `analyzeFeedback(reviewsText, modelType)`.
  - Default model is `deepseek-ai/DeepSeek-V4-Flash`.
  - Uses `response_format: { type: "json_object" }` and parses model output with `JSON.parse`.
- `lib/reviews.ts`
  - Server-side multi-source review ingestion helper.
  - Product Hunt uses official GraphQL, App Store uses Apple Search plus Apple RSS, and Google Play uses `google-play-scraper`.
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
- On missing API key, API failure, empty content, or parse failure, logs full context with `console.error("[AI_ANALYSIS_FAILED]", ...)` and throws `new Error("AI_ANALYSIS_FAILED")`.

Analyze response includes:

- `sourceUrl`
- `language`
- `scrapeSource`
- `reviewCount`
- `reviews`
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
  "reviews": [],
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
REVIEWS_REQUEST_TIMEOUT_MS=120000
ANALYSIS_MAX_REVIEWS=50
ANALYSIS_REVIEW_TEXT_MAX_CHARS=1200
```

Implementation details:

- Product Hunt uses the official Product Hunt API v2 GraphQL endpoint:
  `https://api.producthunt.com/v2/api/graphql`.
- The public API still accepts a Product Hunt URL. Backend code parses `/products/{slug}` from the URL and calls `post(slug: $slug)`.
- Product Hunt GraphQL query fetches product metadata (`name`, `tagline`, `votesCount`, counts/ratings metadata) and paginated `comments(first:, after:, order: NEWEST)`.
- Pagination uses `pageInfo.hasNextPage` and `pageInfo.endCursor`, looping until all available comments are fetched or the active max review count is reached.
- Public helper signature is `fetchReviews(url, options?)`, where `options.maxReviews` can override the default `REVIEWS_MAX_REVIEWS` for a single call. Existing `fetchReviews(url)` calls still use `REVIEWS_MAX_REVIEWS`.
- `/api/reviews` intentionally keeps the default ingestion behavior and does not pass `maxReviews`.
- `/api/analyze` passes `ANALYSIS_MAX_REVIEWS` so Product Hunt analysis defaults to one 50-comment GraphQL page instead of two pages for the default 100-review ingestion cap.
- Normalized Product Hunt comments include `text`, `author`, `authorUsername`, `date`, `votes`, `productName`, and `sourceUrl`.
- Product Hunt response includes `provider: "product-hunt-graphql"` and a `product` metadata object.
- App Store uses Apple public RSS:
  `https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={appId}/sortby=mostrecent/json`
- App Store URLs may include an explicit app id, for example `https://apps.apple.com/{country}/app/.../id{APP_ID}`, or a slug-only path such as `https://apps.apple.com/cn/app/soul/`.
- For slug-only App Store URLs, `lib/reviews.ts` calls Apple Search:
  `https://itunes.apple.com/search?term={slug}&country={country}&entity=software&limit=1`
  and uses the returned `trackId` as the RSS `{appId}`.
- Google Play uses the `google-play-scraper` npm package.
- `REVIEWS_MAX_REVIEWS` defaults to 100.
- Request timeout uses local `AbortController`, default 120 seconds.
- Returns friendly JSON errors for missing Product Hunt token, unsupported source, scraping failures, timeout, and network errors.

## Performance Notes

- Product Hunt analysis was slow because `/api/analyze` waited for full review ingestion and then sent every fetched review body to the AI provider.
- The first optimization keeps response shape and UI untouched while reducing default analysis input size:
  - `ANALYSIS_MAX_REVIEWS=50` limits analysis ingestion to the first page for Product Hunt.
  - `ANALYSIS_REVIEW_TEXT_MAX_CHARS=1200` caps each review body in the AI prompt.
  - `[ANALYZE_TIMING]` server logs expose scrape, analysis, and total durations.
- `scripts/test-review-ingestion.mjs` covers the `maxReviews` override and verifies Product Hunt stops pagination when the requested limit is reached.

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

Latest successful checks after the App Store slug-link fix:

```bash
npm test
npm run test:ai-analysis
npm run test:review-ingestion
npm run build
npx tsc --noEmit
```

Expected build output includes:

```text
ƒ /api/analyze
ƒ /api/reviews
```

Product Hunt helper tests cover:

- Official GraphQL bearer-token usage.
- URL slug parsing.
- Comment normalization.
- `pageInfo.endCursor` pagination.
- Missing `PRODUCT_HUNT_API_TOKEN` error behavior.

Review ingestion tests also cover:

- App Store slug-only URL resolution through Apple Search before RSS fetching.
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
- App Store RSS may return an empty feed for some app/country combinations.
- Google Play scraping depends on public Google Play network availability and may timeout in restricted networks.
- `POST /api/analyze` depends on scraping before model analysis. Product Hunt without `PRODUCT_HUNT_API_TOKEN` returns `MISSING_PRODUCT_HUNT_API_TOKEN`.
- The frontend now consumes `/api/analyze`; real end-to-end tests require network access plus a valid `SILICONFLOW_API_KEY`, and Product Hunt tests also require `PRODUCT_HUNT_API_TOKEN`.
- If `/` unexpectedly returns 404 while `app/page.tsx` exists, reset the generated Next cache with `rm -rf .next` and restart the dev server from the project root.

## Recommended Next Steps

1. Add API-route tests for `/api/analyze` success and `AI_ANALYSIS_FAILED` behavior.
2. Run live smoke tests against App Store, Google Play, and Product Hunt URLs with both required API keys present.
3. Consider adding browser-level tests for empty input, invalid URL, loading, error, and successful dashboard rendering states.
