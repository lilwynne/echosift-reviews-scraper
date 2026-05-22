# Issue: Multi-Source Review Ingestion Backend

## Background

FeatureMap needs to move from a purely mocked dashboard toward a real review-ingestion pipeline. The backend accepts public product links and fetches normalized reviews from Product Hunt, Apple App Store, or Google Play without changing the approved frontend layout.

## Current Status

- `POST /api/reviews` exposes raw review-ingestion results for script/Postman testing.
- `POST /api/analyze` calls the ingestion helper first, then returns the existing mock dashboard plus scraped review metadata.
- Product Hunt uses the official Product Hunt API v2 GraphQL endpoint with the user's Developer Token.
- Apple App Store uses the public Apple RSS feed and does not require a token.
- Google Play uses `google-play-scraper` and does not require a token.
- The old Product Hunt crawler/deployment path has been removed from the repo.
- Frontend Tailwind classes and component layout were not changed.

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

Smoke-test notes:

- Product Hunt backend helper tests cover official GraphQL bearer-token usage, URL slug parsing, comment normalization, missing-token handling, and cursor pagination.
- Live Product Hunt extraction still needs a real `PRODUCT_HUNT_API_TOKEN`.
- App Store RSS can return an empty feed for some app/country combinations.
- Google Play can timeout or fail from restricted networks.

## Remaining Todo

- Configure backend `.env.local` with `PRODUCT_HUNT_API_TOKEN`.
- Rerun live Product Hunt extraction against known Product Hunt URLs through `/api/reviews`.
- Test Apple RSS from the deployment network with target customer app links.
- Test Google Play from the deployment network and tune timeout/retry behavior if needed.
- Decide whether `/api/analyze` should fail hard on scraping errors or fall back to mock data for MVP demos.
- Feed normalized `reviews` into the next AI analysis pipeline step.
