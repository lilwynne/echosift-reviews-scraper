# AI Handoff: FeatureMap MVP

## Current Status

FeatureMap is a Next.js App Router MVP prototype for turning product review URLs into an AI-generated feature roadmap dashboard.

The frontend prototype and UI are considered confirmed by the user. Important constraint for future work:

- Do not modify existing UI styles, Tailwind class names, or component layout unless the user explicitly asks.
- Recent backend work implemented server-side review ingestion and API routes. The Product Hunt path now uses the official Product Hunt API v2 GraphQL endpoint.
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
- Site is dark mode with cold blue/cyan gradient background.
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
  - Calls `fetchReviews(url)` before returning the existing mock dashboard.
- `app/api/reviews/route.ts`
  - Backend API route for testing raw review ingestion.
- `lib/reviews.ts`
  - Server-side multi-source review ingestion helper.
  - Product Hunt uses official GraphQL, App Store uses Apple RSS, and Google Play uses `google-play-scraper`.
- `lib/api-errors.ts`
  - Shared review-ingestion error-code to HTTP-status mapping.
- `scripts/test-review-ingestion.mjs`
  - Local unit tests for Product Hunt GraphQL review ingestion helper behavior.
- `scripts/test-reviews.mjs`
  - Local smoke-test script that calls `POST /api/reviews` on a running dev server.

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

## Review Ingestion

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

Product Hunt required backend variable:

```env
PRODUCT_HUNT_API_TOKEN=your_product_hunt_developer_token
```

Optional environment variables:

```env
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=120000
```

Implementation details:

- Product Hunt uses the official Product Hunt API v2 GraphQL endpoint:
  `https://api.producthunt.com/v2/api/graphql`.
- The public API still accepts a Product Hunt URL. Backend code parses `/products/{slug}` from the URL and calls `post(slug: $slug)`.
- Product Hunt GraphQL query fetches product metadata (`name`, `tagline`, `votesCount`, counts/ratings metadata) and paginated `comments(first:, after:, order: NEWEST)`.
- Pagination uses `pageInfo.hasNextPage` and `pageInfo.endCursor`, looping until all available comments are fetched or `REVIEWS_MAX_REVIEWS` is reached.
- Normalized Product Hunt comments include `text`, `author`, `authorUsername`, `date`, `votes`, `productName`, and `sourceUrl`.
- Product Hunt response includes `provider: "product-hunt-graphql"` and a `product` metadata object.
- App Store uses Apple public RSS:
  `https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={appId}/sortby=mostrecent/json`
- Google Play uses the `google-play-scraper` npm package.
- `REVIEWS_MAX_REVIEWS` defaults to 100.
- Request timeout uses local `AbortController`, default 120 seconds.
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

Latest successful checks after removing the old actor path:

```bash
npm run test:review-ingestion
npm run lint
npm run build
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

## Known Constraints

- Network access may require local proxy/approval for package installs or live source tests.
- Starting Next dev server may require escalation if the sandbox blocks local port listening.
- Do not run destructive git commands.
- Product Hunt backend calls require a valid `PRODUCT_HUNT_API_TOKEN` in backend `.env.local`.
- App Store RSS may return an empty feed for some app/country combinations.
- Google Play scraping depends on public Google Play network availability and may timeout in restricted networks.
- `POST /api/analyze` currently depends on scraping before returning the mock dashboard. Product Hunt without `PRODUCT_HUNT_API_TOKEN` returns `MISSING_PRODUCT_HUNT_API_TOKEN`.

## Recommended Next Steps

1. Add backend `.env.local` with `PRODUCT_HUNT_API_TOKEN`, then run `/api/reviews` Product Hunt integration smoke tests against known Product Hunt URLs.
2. Decide whether `/api/analyze` should fail hard on scraping errors or fall back to the existing mock dashboard during MVP demos.
3. Wire frontend analysis flow to call `POST /api/analyze` only after the API behavior above is confirmed.
4. Use normalized `reviews` as the input for the next AI analysis pipeline step.
