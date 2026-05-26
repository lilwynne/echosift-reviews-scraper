# Issue: Multi-Source Review Ingestion Backend

## Background

EchoSift needs to move from a purely mocked dashboard toward a real review-ingestion pipeline. The backend accepts public product links and fetches normalized reviews from Product Hunt, Apple App Store, or Google Play without changing the lightweight frontend direction.

## Current Status

- `POST /api/reviews` exposes raw review-ingestion results for script/Postman testing.
- `POST /api/analyze` calls the ingestion helper first, then returns the existing mock dashboard plus scraped review metadata.
- Product Hunt uses the official Product Hunt API v2 GraphQL endpoint with the user's Developer Token.
- Apple App Store uses Apple Search for slug-only links and the public Apple RSS feed for reviews; it does not require a token.
- Google Play uses `google-play-scraper` and does not require a token.
- The old Product Hunt crawler/deployment path has been removed from the repo.
- The frontend now shows a single free mode, no auth controls, and no model picker.
- The "Real-time Insight Preview" hero module has been rebuilt with idle, scanning, and reveal states using Framer Motion spring animations.

## Key Decisions

- Keep ingestion in a server-only helper: `lib/reviews.ts`.
- Keep the public `fetchReviews(url)` interface stable for both API routes.
- Return normalized `NormalizedReview[]` across sources.
- Use `provider` to identify the active backend provider for each source.
- Use `REVIEWS_MAX_REVIEWS` and `REVIEWS_REQUEST_TIMEOUT_MS` for ingestion limits/timeouts.
- Keep `/api/analyze` response compatible with the existing mock dashboard while adding `scrapeSource`, `reviewCount`, and `reviews`.

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
  - Provider: Apple RSS
  - URL format: `https://apps.apple.com/{country}/app/.../id{APP_ID}`
  - Slug-only URL format also supported: `https://apps.apple.com/{country}/app/{slug}/`
  - Slug-only links resolve `{slug}` through Apple Search, then use the returned `trackId` for RSS.
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
- Browser verification on `http://127.0.0.1:3000` captured idle, scanning, and reveal states for the preview module.

Smoke-test notes:

- Product Hunt backend helper tests cover official GraphQL bearer-token usage, URL slug parsing, comment normalization, missing-token handling, and cursor pagination.
- App Store helper tests cover slug-only link resolution for `https://apps.apple.com/cn/app/soul/`, including Apple Search lookup followed by Apple RSS fetching.
- Invalid App Store source URLs now return `INVALID_REVIEW_SOURCE_URL`, mapped to HTTP 400 instead of 502.
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

## Remaining Todo

- Configure backend `.env.local` with `PRODUCT_HUNT_API_TOKEN`.
- Rerun live Product Hunt extraction against known Product Hunt URLs through `/api/reviews`.
- Test Apple RSS from the deployment network with target customer app links.
- Live-test slug-only App Store links from the deployment network and confirm Apple Search resolves the intended app when names are ambiguous.
- Test Google Play from the deployment network and tune timeout/retry behavior if needed.
- Decide whether `/api/analyze` should fail hard on scraping errors or fall back to mock data for MVP demos.
- Feed normalized `reviews` into the next AI analysis pipeline step.
