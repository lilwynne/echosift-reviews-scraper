# Issue: Multi-Source Review Ingestion Backend

## Background

EchoSift needs to move from a purely mocked dashboard toward a real review-ingestion pipeline. The backend accepts public product links and fetches normalized reviews from Product Hunt, Apple App Store, or Google Play without changing the lightweight frontend direction.

## Current Status

- `POST /api/reviews` exposes raw review-ingestion results for script/Postman testing.
- `POST /api/analyze` calls the ingestion helper first, then returns the existing mock dashboard plus scraped review metadata.
- Product Hunt uses the official Product Hunt API v2 GraphQL endpoint with the user's Developer Token.
- Apple App Store uses Apple Search for slug-only links, Apple RSS as the first review source, and App Store web page parsing as a fallback when RSS returns no reviews; it does not require a token.
- Google Play uses `google-play-scraper` and does not require a token.
- The Chrome extension has a lighter content-script URL watcher, background in-flight request dedupe, session-memory result caching, and a 90-second analysis request timeout.
- The old Product Hunt crawler/deployment path has been removed from the repo.
- The frontend now shows a single free mode, no auth controls, and no model picker.
- The "Real-time Insight Preview" hero module has been rebuilt with idle, scanning, and reveal states using Framer Motion spring animations.

## Key Decisions

- Keep ingestion in a server-only helper: `lib/reviews.ts`.
- Keep the public `fetchReviews(url)` interface stable for both API routes.
- Return normalized `NormalizedReview[]` across sources.
- Use `provider` to identify the active backend provider for each source.
- Use `REVIEWS_MAX_REVIEWS` and `REVIEWS_REQUEST_TIMEOUT_MS` for ingestion limits/timeouts.
- Use `ANALYSIS_MAX_REVIEWS=50` by default for `/api/analyze`; `/api/reviews` keeps the broader ingestion default.
- Use webpage-only async analysis jobs for the homepage. Web jobs default to `WEB_ANALYSIS_MAX_REVIEWS=100`, select `WEB_ANALYSIS_SELECTED_REVIEW_LIMIT=40` high-value reviews for AI, and trim selected review text to `WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS=600`.
- Keep `/api/analyze` response compatible with the existing mock dashboard while adding `scrapeSource`, `reviewCount`, and `reviews`.
- Keep the Chrome extension on synchronous `/api/analyze` for compatibility.
- Keep extension type checking separate from the Next.js app because Plasmo uses its own `~src/*` alias and `extension/tsconfig.json`.

## Supported Sources

- Product Hunt:
  - Host: `producthunt.com`
  - Provider: Product Hunt official GraphQL (`product-hunt-graphql`)
  - Required env: `PRODUCT_HUNT_API_TOKEN`
  - URL format: `https://www.producthunt.com/products/{slug}`
  - Backend parses `{slug}` from the URL and calls `post(slug: $slug)`
  - Fetches product metadata (`name`, `tagline`, `votesCount`) and paginated comments
  - Pagination uses `comments(first:, after:, order: NEWEST)` plus `pageInfo.hasNextPage` / `pageInfo.endCursor`
- Apple App Store:
  - Host: `apps.apple.com`
  - Provider: Apple RSS (`apple-rss`) first, App Store web page fallback (`apple-web-page`) when RSS is empty
  - URL format: `https://apps.apple.com/{country}/app/.../id{APP_ID}`
  - Slug-only URL format also supported: `https://apps.apple.com/{country}/app/{slug}/`
  - Slug-only links resolve `{slug}` through Apple Search, then use the returned `trackId` for RSS.
  - Web fallback parses the product page's `serialized-server-data` and extracts visible `Review` records from `allProductReviews` / `userProductReviews`.
- Google Play:
  - Host/path: `play.google.com/store/apps/details`
  - Provider: `google-play-scraper`
  - URL format: `https://play.google.com/store/apps/details?id={APP_ID}&hl=en&gl=us`

## Cleanup Completed

- Removed the old Product Hunt actor directory.
- Removed the old actor deployment script and GitHub workflow.
- Removed root `actor:*` npm scripts.
- Renamed the active review helper and helper tests to neutral review-ingestion names.
- Removed obsolete actor response fields, error mappings, environment-variable fallbacks, and loading copy references.

## Testing

Completed:

- `npm run test:review-ingestion` passed.
- `npm run lint` passed with no warnings or errors.
- `npm run build` passed.
- Build output includes both API routes:
  - `ƒ /api/analyze`
  - `ƒ /api/reviews`
- Chrome extension typecheck and production build cover the current plugin source.
- Browser verification on `http://127.0.0.1:3000` captured idle, scanning, and reveal states for the preview module.

Smoke-test notes:

- Product Hunt backend helper tests cover official GraphQL bearer-token usage, URL slug parsing, comment normalization, missing-token handling, and cursor pagination.
- App Store helper tests cover slug-only link resolution for `https://apps.apple.com/cn/app/soul/`, Apple Search lookup followed by Apple RSS fetching, RSS-first behavior, RSS-empty web fallback parsing, and safe empty results when page data is missing.
- Invalid App Store source URLs now return `INVALID_REVIEW_SOURCE_URL`, mapped to HTTP 400 instead of 502.
- `/api/analyze` now returns an empty analysis response immediately when ingestion returns zero reviews, without requiring an AI request.
- Webpage analysis now runs through `POST /api/analyze/jobs` plus `GET /api/analyze/jobs/{jobId}` polling. Tests cover job completion, cache-hit jobs, failed jobs, 100 fetched reviews, 40 AI reviews, and evidence remapping.
- Live Product Hunt extraction still needs a real `PRODUCT_HUNT_API_TOKEN`.
- App Store RSS can return an empty feed for some app/country combinations.
- Google Play can timeout or fail from restricted networks.

## Issue Log

### 2026-05-26: App Store slug-only link returned 502

- Input link: `https://apps.apple.com/cn/app/soul/`
- Symptom: Browser DevTools showed `POST /api/analyze` returning HTTP `502 Bad Gateway`.
- Root cause: `lib/reviews.ts` only parsed App Store app ids from `/id{APP_ID}` paths. The slug-only path had no app id, so the backend returned `REVIEW_FETCH_FAILED`, which `lib/api-errors.ts` mapped to 502.
- Fix: Added App Store slug parsing, Apple Search `trackId` resolution, and `INVALID_REVIEW_SOURCE_URL` for malformed source links.
- Validation: `npm run test:review-ingestion`, `npm test`, and `npm run build` passed. Local browser verification was not completed in that run because the sandbox blocked dev-server port binding with `listen EPERM`.

### 2026-05-29: Chrome extension response felt slow

- Symptom: the extension could feel slow because every click sent a fresh `/api/analyze` request, repeated clicks were not shared, and the content script continuously watched page-wide DOM mutations plus a 500ms URL poll.
- Fix: moved duplicate request handling into the background service worker, cached successful results in `chrome.storage.session` with an in-memory fallback, added request timeout handling, and replaced page-wide URL polling with event-driven SPA URL detection plus a click-debounced fallback.
- Backend alignment: `/api/analyze` now defaults to `ANALYSIS_MAX_REVIEWS=50`, matching the documented fast Product Hunt analysis path.

### 2026-05-29: App Store RSS returned empty while the web page showed reviews

- Input link: `https://apps.apple.com/cn/app/ima-%E8%85%BE%E8%AE%AF-ai-%E5%B7%A5%E4%BD%9C%E5%8F%B0/id6737188438`
- Symptom: `/api/analyze` returned HTTP 200 with `reviewCount: 0` and an empty analysis, even though the App Store product page showed user reviews.
- Root cause: `lib/reviews.ts` only trusted Apple RSS. Some App Store pages can expose review snippets in the rendered web page even when the RSS feed is empty or temporarily unavailable.
- Fix: keep RSS as the first source, then fetch the product page and parse `serialized-server-data` for `Review` records when RSS returns zero reviews. The fallback returns `provider: "apple-web-page"`.
- Performance fix: `/api/analyze` now short-circuits zero-review results and returns the standard empty analysis object without calling SiliconFlow.

### 2026-05-30: Web analysis needed 100-review support without slower first results

- Symptom: 50-review webpage and extension analyses could take tens of seconds, and increasing analysis input to 100 full reviews would make model latency worse.
- Scope: optimized the webpage first and left the Chrome extension on the existing synchronous `/api/analyze` path.
- Fix: added webpage-only async job endpoints, `POST /api/analyze/jobs` and `GET /api/analyze/jobs/{jobId}`. The homepage now submits a job and polls every 1.5 seconds while mapping queued/scraping/analyzing states to the existing loading UI.
- Analysis strategy: web jobs fetch up to 100 reviews, select up to 40 high-value reviews for the AI prompt, and trim each selected review to 600 characters. The response still returns the full fetched review evidence pool.
- Evidence fix: because AI sees a selected subset, backend evidence indexes are remapped from AI prompt indexes back to the full response `reviews` before the dashboard renders evidence buttons.
- Cache fix: analysis cache keys now use `analysis:v3` and include normalized URL, language, max review count, selected review limit, text cap, and model type to avoid 50-review and 100-review result collisions.
- Validation completed: `npm run test:api-guards`, `npm run test:analyze-route`, `npm run test:ai-analysis`, `npm run test:review-ingestion`, `npm run lint`, `npm test`, and `npm run build` passed. Build output includes `/api/analyze/jobs` and `/api/analyze/jobs/[jobId]`.

## Remaining Todo

- Configure backend `.env.local` with `PRODUCT_HUNT_API_TOKEN`.
- Rerun live Product Hunt extraction against known Product Hunt URLs through `/api/reviews`.
- Test Apple RSS plus App Store web fallback from the deployment network with target customer app links.
- Live-test slug-only App Store links from the deployment network and confirm Apple Search resolves the intended app when names are ambiguous.
- Test Google Play from the deployment network and tune timeout/retry behavior if needed.
- Decide whether `/api/analyze` should fail hard on scraping errors or fall back to mock data for MVP demos.
- Run live browser smoke tests for the new webpage job flow with valid `SILICONFLOW_API_KEY`, and with `PRODUCT_HUNT_API_TOKEN` for Product Hunt links.
