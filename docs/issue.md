# Issue: Implement Multi-Source Review Scraping Backend

## Background

FeatureMap needs to move from a purely mocked dashboard toward a real review-ingestion pipeline. The backend now accepts public product links and fetches normalized reviews from Product Hunt, Apple App Store, or Google Play without changing the approved frontend UI.

## Current Status

- `POST /api/reviews` exposes raw scraping results for script/Postman testing.
- `POST /api/analyze` calls the scraper first, then returns the existing mock dashboard plus scraped review metadata.
- Product Hunt remains on Apify and now has a deployed self-built actor.
- Apple App Store uses the public Apple RSS feed and does not require a token.
- Google Play uses `google-play-scraper` and does not require a token.
- Frontend UI, Tailwind classes, and component layout were not changed.

## Key Decisions

- Keep scraping in a server-only helper: `lib/apify-reviews.ts`.
- Keep the public `fetchReviews(url)` interface stable for both API routes.
- Return normalized `NormalizedReview[]` across sources.
- Use `provider` instead of requiring every source to expose `actorId`.
- Add `REVIEWS_MAX_REVIEWS` and `REVIEWS_REQUEST_TIMEOUT_MS`, with legacy `APIFY_MAX_REVIEWS` / `APIFY_REQUEST_TIMEOUT_MS` fallback.
- Keep `/api/analyze` response compatible with the existing mock dashboard while adding `scrapeSource`, `reviewCount`, and `reviews`.

## Supported Sources

- Product Hunt:
  - Host: `producthunt.com`
  - Provider: Apify
  - Required env: `APIFY_API_TOKEN`
  - Actor override: `APIFY_PRODUCT_HUNT_ACTOR_ID=feature_map/product-hunt-reviews`
  - Actor source: `actors/product-hunt-reviews`
  - Apify internal actor ID: `xHkiWaZEikt9m0kBy`
- Apple App Store:
  - Host: `apps.apple.com`
  - Provider: Apple RSS
  - URL format: `https://apps.apple.com/{country}/app/.../id{APP_ID}`
- Google Play:
  - Host/path: `play.google.com/store/apps/details`
  - Provider: `google-play-scraper`
  - URL format: `https://play.google.com/store/apps/details?id={APP_ID}&hl=en&gl=us`

## Testing

Completed:

- `npm run lint` passed with no warnings or errors.
- `npm run build` passed.
- Build output includes both API routes:
  - `ƒ /api/analyze`
  - `ƒ /api/reviews`

Smoke-test notes:

- Local App Store API smoke test returned a valid 200 JSON response, but Apple RSS returned an empty feed for tested app/country combinations in this environment.
- Local Google Play API smoke test reached the API route and returned a friendly scraping error when Google Play timed out from this network.
- Product Hunt actor deployment succeeded on Apify, latest tested build `0.1.3 / latest`.
- Product Hunt actor cloud input handling was fixed to use `ACTOR_DEFAULT_KEY_VALUE_STORE_ID`, `ACTOR_INPUT_KEY`, and `ACTOR_DEFAULT_DATASET_ID`.
- Product Hunt actor default proxy is now disabled because the account does not have access to `DATACENTER`.
- Product Hunt actor smoke test against `https://www.producthunt.com/products/claude` read input and completed, but returned `SCRAPE_EMPTY_OR_BLOCKED` with zero reviews.
- Product Hunt actor smoke test using available proxy group `BUYPROXIES94952` completed but page fetches returned `fetch failed`.

## Remaining Todo

- Configure `.env.local` with `APIFY_API_TOKEN` and `APIFY_PRODUCT_HUNT_ACTOR_ID=feature_map/product-hunt-reviews` for Product Hunt.
- Debug live Product Hunt extraction in `actors/product-hunt-reviews`; deployment is complete but real review extraction is not yet functionally validated.
- Test Apple RSS from the deployment network with target customer app links.
- Test Google Play from the deployment network and tune timeout/retry behavior if needed.
- Decide whether `/api/analyze` should fail hard on scraping errors or fall back to mock data for MVP demos.
- Feed normalized `reviews` into the next AI analysis pipeline step.
