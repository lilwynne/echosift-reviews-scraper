# AI Handoff: FeatureMap MVP

## Current Status

FeatureMap is a Next.js App Router MVP prototype for turning product review URLs into an AI-generated feature roadmap dashboard.

The frontend prototype and UI are considered confirmed by the user. Important constraint for future work:

- Do not modify existing UI styles, Tailwind class names, or component layout unless the user explicitly asks.
- Recent work implemented the server-side review ingestion layer and API routes. No UI files were changed.

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
- lucide-react
- recharts
- TypeScript

## Key Product/UI Decisions Already Made

- Product name is `FeatureMap`.
- UI language options:
  - `zh-CN`: 简体中文
  - `zh-TW`: 繁體中文
  - `en`: English
- Model options:
  - `deepseek`
  - `claude`
  - `gpt4o`
- Site is now dark mode with cold blue/cyan gradient background.
- Header contains logo, nav, language selector, login, signup.
- Header nav uses `价格 / 價格 / Pricing`, not subscription.
- Bottom email subscription banner was removed from the rendered page.
- No competitor or reference product names should appear in visible copy.
- Dashboard currently consumes localized mock data from `lib/mock-data.ts`.

## Important Files

- `app/page.tsx`
  - Main single-page frontend state.
  - Uses `localizedContent[language]`.
  - Still renders Dashboard from local mock content after simulated loading.
- `lib/mock-data.ts`
  - Product/localization data.
  - Dashboard mock source of truth.
  - Contains lucide icon component references in the frontend mock data.
- `components/Dashboard.tsx`
  - Passes `content.kpis`, `content.sentiment`, `content.kanban` into dashboard subcomponents.
- `components/KpiCards.tsx`
  - Expects `items: LocaleContent["kpis"]`.
- `components/SentimentChart.tsx`
  - Expects `content: LocaleContent["sentiment"]`.
  - Uses imported `trendData` from `lib/mock-data.ts`.
- `components/PriorityKanban.tsx`
  - Expects `content: LocaleContent["kanban"]`.
- `app/api/analyze/route.ts`
  - Backend API route for analysis.
  - Now calls `fetchReviews(url)` before returning the existing mock dashboard.
- `app/api/reviews/route.ts`
  - Backend API route for testing raw review scraping.
- `lib/apify-reviews.ts`
  - Server-side multi-source review scraper helper.
- `lib/api-errors.ts`
  - Shared scrape error-code to HTTP-status mapping.
- `scripts/test-reviews.mjs`
  - Local test script that calls `POST /api/reviews`.
- `actors/product-hunt-reviews/`
  - Self-built Apify actor for Product Hunt product review scraping.
  - Uses Node/TypeScript, HTTP fetch, and HTML parsing. It does not use browser automation.
  - Deployed Apify actor: `feature_map/product-hunt-reviews` (`xHkiWaZEikt9m0kBy`).

## API Route Implemented

Endpoint:

```text
POST /api/analyze
```

Request body:

```json
{
  "url": "https://www.producthunt.com/products/example-product",
  "model": "deepseek",
  "language": "zh-CN"
}
```

Validation:

- `url` must be a non-empty valid `http:` or `https:` URL.
- `model` must be one of `deepseek`, `claude`, `gpt4o`.
- `language` must be one of `zh-CN`, `zh-TW`, `en`.

Success response shape:

- `sourceUrl`
- `model`
- `language`
- `scrapeSource`
- `reviewCount`
- `reviews`
- `dashboard`
- `kpis`
- `sentiment`
- `trendData`
- `kanban`

`scrapeSource`, `reviewCount`, and `reviews` come from the review ingestion helper. Dashboard fields are still mock data from `lib/mock-data.ts`.

## Review Scraping

Endpoint:

```text
POST /api/reviews
```

Request body:

```json
{
  "url": "https://www.producthunt.com/products/example-product"
}
```

Supported sources:

- Product Hunt URLs on `producthunt.com`
- Apple App Store URLs on `apps.apple.com`
- Google Play URLs on `play.google.com/store/apps/details`

Product Hunt required environment variable:

```env
APIFY_API_TOKEN=your_apify_api_token
```

Optional environment variables:

```env
APIFY_PRODUCT_HUNT_ACTOR_ID=feature_map/product-hunt-reviews
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=120000
APIFY_MAX_REVIEWS=100
APIFY_REQUEST_TIMEOUT_MS=120000
APIFY_RUN_TIMEOUT_SECS=120
```

Implementation details:

- Product Hunt still uses Apify REST endpoint `POST /v2/acts/{actorId}/run-sync-get-dataset-items`.
- The current self-built Product Hunt actor lives in `actors/product-hunt-reviews` and is deployed privately under the user's Apify account as `feature_map/product-hunt-reviews`.
- The actor input is compatible with the backend payload: `start_urls: [{ url }]`, `max_comments`, and optional `proxyConfiguration`.
- Actor output keeps fields recognized by the normalizer: `id`, `body`, `author`, `created_at`, `vote_count`, `product_name`, `product_url`, `url`, plus extra diagnostics and section fields.
- Actor `proxyConfiguration` now defaults to `{ "useApifyProxy": false }` because this Apify account does not have access to the `DATACENTER` proxy group.
- Actor cloud I/O uses Apify runtime env vars `ACTOR_DEFAULT_KEY_VALUE_STORE_ID`, `ACTOR_INPUT_KEY`, and `ACTOR_DEFAULT_DATASET_ID`; this was fixed after deployment testing showed the previous `APIFY_DEFAULT_*` names did not read run input.
- App Store uses Apple public RSS:
  `https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={appId}/sortby=mostrecent/json`
- Google Play uses the `google-play-scraper` npm package.
- `REVIEWS_MAX_REVIEWS` defaults to 100 and falls back to legacy `APIFY_MAX_REVIEWS`.
- Uses local `AbortController` timeout, default 120 seconds.
- Returns friendly JSON errors for missing Product Hunt token, unsupported source, scraping failures, timeout, and network errors.

The response is aligned with the current Dashboard mock structure. Since JSON cannot return lucide React components, the API serializes icons as string keys:

- `MessageSquare`
- `HeartPulse`
- `Tags`
- `Bug`
- `Lightbulb`
- `AlertTriangle`

Implementation note:

- lucide runtime exposes `AlertTriangle` as `TriangleAlert`, so `app/api/analyze/route.ts` normalizes that value back to `AlertTriangle`.

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
- `INVALID_MODEL`
- `INVALID_LANGUAGE`
- `MISSING_APIFY_API_TOKEN`
- `UNSUPPORTED_REVIEW_SOURCE`
- `APIFY_REQUEST_FAILED`
- `APIFY_NETWORK_ERROR`
- `REVIEW_FETCH_TIMEOUT`
- `REVIEW_FETCH_NETWORK_ERROR`
- `REVIEW_FETCH_FAILED`

## Files Modified During Current Backend Task

- Added `lib/apify-reviews.ts`
- Added `lib/api-errors.ts`
- Added `app/api/reviews/route.ts`
- Added `scripts/test-reviews.mjs`
- Added `actors/product-hunt-reviews/`
- Added `docs/issue.md`
- Added `docs/pr-description.md`
- Updated `app/api/analyze/route.ts`
- Updated `docs/ai-handoff.md`

No existing UI file was changed during the review scraping implementation.

## Earlier Major Frontend Files Created/Modified

These existed before the current backend task and should be treated as user-approved UI:

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `tailwind.config.ts`
- `lib/mock-data.ts`
- `components/Header.tsx`
- `components/HeroAnalyzer.tsx`
- `components/ProductShowcase.tsx`
- `components/UseCases.tsx`
- `components/AuthModal.tsx`
- `components/FeatureMapLogo.tsx`
- `components/Dashboard.tsx`
- `components/KpiCards.tsx`
- `components/SentimentChart.tsx`
- `components/PriorityKanban.tsx`
- `components/LoadingState.tsx`

`components/SubscriptionPanel.tsx` still exists but is not rendered in `app/page.tsx`.

## Test Results

Last successful checks:

```bash
npm run lint
npm run build
npm run actor:test
```

Results:

- ESLint: passed with no warnings or errors.
- Production build: passed.
- Product Hunt actor TypeScript build and parser fixture tests passed.
- Next build output includes:

```text
ƒ /api/analyze
ƒ /api/reviews
```

API smoke test summary:

```json
{
  "status": "ok",
  "sourceUrl": "https://www.producthunt.com/products/example-product",
  "kpis": 3,
  "trendData": 7,
  "columns": 3,
  "lastIcon": "AlertTriangle"
}
```

Invalid URL smoke test returned:

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "请输入有效的产品链接。"
  }
}
```

Apify actor deployment:

```text
Actor ID: feature_map/product-hunt-reviews
Internal ID: xHkiWaZEikt9m0kBy
Latest build tested: 0.1.3 / latest
```

Apify actor smoke tests:

- Deployment/build succeeded.
- Actor successfully reads Apify run input after the `ACTOR_DEFAULT_*` env var fix.
- Test input: `https://www.producthunt.com/products/claude`, `max_comments: 20`.
- No-proxy run finished successfully but returned one diagnostic item with `code: "SCRAPE_EMPTY_OR_BLOCKED"` and `count: 0`.
- Run with accessible proxy group `BUYPROXIES94952` also finished, but all Product Hunt page fetches returned `fetch failed`.
- Conclusion: actor deployment is complete, but Product Hunt review extraction still needs further page/proxy strategy work before it can be treated as production-ready.

Runtime recovery performed after build/dev cache mismatch:

- A stale Next dev process was listening on `127.0.0.1:3000`.
- `.next` cache was removed and the dev server was restarted.
- Dev server compiled `/` successfully and logged `GET / 200`.

## Known Constraints

- Network access may require using local proxy/approval for package installs.
- Starting Next dev server requires escalation because sandbox blocks local port listening.
- Do not run destructive git commands.
- Git is initialized now, but the working tree currently shows the project files as untracked.
- Product Hunt backend calls require a valid `APIFY_API_TOKEN` in `.env.local`.
- The deployed self-built actor currently starts correctly but does not extract live Product Hunt review items from the tested Claude page. Treat Product Hunt ingestion as deployed but not functionally validated for real reviews.
- Apify account proxy access observed during deployment: `DATACENTER` is not available; `BUYPROXIES94952` is available but produced `fetch failed` for Product Hunt pages in the actor smoke test.
- App Store RSS may return an empty feed for some app/country combinations.
- Google Play scraping depends on public Google Play network availability and may timeout in restricted networks.
- `POST /api/analyze` now depends on scraping before returning the mock dashboard. Product Hunt without `APIFY_API_TOKEN` returns `MISSING_APIFY_API_TOKEN`.

## Recommended Next Steps

1. Add `.env.local` with `APIFY_API_TOKEN` and `APIFY_PRODUCT_HUNT_ACTOR_ID=feature_map/product-hunt-reviews`, then run `/api/reviews` Product Hunt integration smoke tests.
2. Debug Product Hunt live extraction inside `actors/product-hunt-reviews`: persist a fetched HTML sample or inspect run logs to determine whether Product Hunt returns client-rendered content, blocked content, or markup the parser does not cover.
3. Evaluate proxy strategy before enabling proxy by default; avoid `DATACENTER` for this account unless the plan changes.
4. Decide whether `/api/analyze` should fail hard on scraping errors or fall back to the existing mock dashboard during MVP demos.
5. Wire frontend analysis flow to call `POST /api/analyze` only after the API behavior above is confirmed.
6. Use normalized `reviews` as the input for the next AI analysis pipeline step.
