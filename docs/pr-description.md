# PR: Add App Store and Google Play Review Scraping

## Summary

This PR expands FeatureMap's review-ingestion backend beyond Product Hunt and then moves Product Hunt ingestion from Apify to the official Product Hunt API v2 GraphQL endpoint. Apple App Store uses Apple's public RSS feed and Google Play uses `google-play-scraper`.

The approved frontend UI was intentionally left unchanged.

## What Changed

- Updated `lib/apify-reviews.ts`
  - Keeps the public `fetchReviews(url)` API.
  - Detects Product Hunt, App Store, and Google Play links.
  - Parses Product Hunt `/products/{slug}` URLs and calls official GraphQL `post(slug:)`.
  - Fetches Product Hunt product metadata and paginated comments via `comments(first:, after:, order: NEWEST)`.
  - Follows `pageInfo.hasNextPage` / `pageInfo.endCursor` until comments are exhausted or `REVIEWS_MAX_REVIEWS` is reached.
  - Fetches App Store reviews from Apple RSS with app id and country parsing.
  - Fetches Google Play reviews with `google-play-scraper`.
  - Normalizes all sources into `NormalizedReview[]`.
  - Adds `provider`, with Product Hunt now returning `product-hunt-graphql`.
  - Adds generic review fetch errors for timeout/network/failure cases.

- Updated `lib/api-errors.ts`
  - Maps new generic review error codes to HTTP 502/504 responses.
  - Maps missing Product Hunt Developer Token to HTTP 500.

- Updated `scripts/test-reviews.mjs`
  - Defaults to an App Store link so the test script no longer requires Apify credentials unless a Product Hunt URL is provided.

- Added `actors/product-hunt-reviews`
  - Self-built Product Hunt reviews Apify actor using Node/TypeScript, raw fetch plus Playwright fallback, and structured-data parsing.
  - Compatible with the backend's existing Product Hunt actor input shape.
  - Deployed privately as `feature_map/product-hunt-reviews` (`xHkiWaZEikt9m0kBy`).
  - Uses explicit Product Hunt proxy configuration from backend env and reports when proxy is missing or still challenged.
  - Uses Apify cloud env vars `ACTOR_DEFAULT_KEY_VALUE_STORE_ID`, `ACTOR_INPUT_KEY`, and `ACTOR_DEFAULT_DATASET_ID` for input/output storage.
  - This actor is now legacy/fallback reference code; backend Product Hunt ingestion no longer calls it.

- Updated dependencies
  - Added `google-play-scraper`.

- Updated documentation
  - `docs/ai-handoff.md`
  - `docs/issue.md`
  - `docs/pr-description.md`

## Environment Variables

Product Hunt only:

```env
PRODUCT_HUNT_API_TOKEN=your_product_hunt_developer_token
```

All sources:

```env
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=120000
```

Legacy fallbacks still work:

```env
APIFY_MAX_REVIEWS=100
APIFY_REQUEST_TIMEOUT_MS=120000
```

## API Notes

`POST /api/reviews`

```json
{
  "url": "https://apps.apple.com/us/app/facebook/id284882215"
}
```

Successful response shape:

```json
{
  "ok": true,
  "source": "product-hunt",
  "sourceUrl": "https://www.producthunt.com/products/example-product",
  "provider": "product-hunt-graphql",
  "product": {
    "source": "product-hunt",
    "sourceUrl": "https://www.producthunt.com/products/example-product",
    "name": "Example Product",
    "slug": "example-product",
    "tagline": "Example tagline",
    "votesCount": 123
  },
  "count": 1,
  "reviews": [
    {
      "source": "product-hunt",
      "sourceUrl": "https://www.producthunt.com/products/example-product",
      "productName": "Example Product",
      "text": "Useful product.",
      "author": "Ada Example",
      "authorUsername": "ada",
      "date": "2026-05-03T00:00:00Z",
      "votes": 7
    }
  ],
  "rawItems": []
}
```

`POST /api/analyze` keeps the existing dashboard response and includes:

```json
{
  "scrapeSource": "app-store",
  "reviewCount": 0,
  "reviews": []
}
```

## Testing

Passed locally:

```bash
npm run test:apify-reviews
npm run build
```

Build output includes:

```text
ƒ /api/analyze
ƒ /api/reviews
```

Smoke-test notes:

- App Store local API route returned 200 JSON, but Apple RSS returned an empty feed for tested app/country combinations in this environment.
- Google Play local API route returned a friendly error when Google Play timed out from this environment.
- Product Hunt GraphQL helper tests cover bearer-token usage, URL slug parsing, comment normalization, and cursor pagination.
- Live Product Hunt GraphQL validation still needs to be run with the user's real Developer Token.

## Risks / Follow-Ups

- Live Product Hunt validation still needs to be rerun with a valid `PRODUCT_HUNT_API_TOKEN`.
- The legacy Apify actor remains in the repo; remove it later if the GraphQL flow is sufficient in production.
- Apple RSS can return empty feeds for some app/country combinations.
- Google Play scraping is unofficial and may fail when Google changes markup or blocks the runtime network.
- `/api/analyze` currently fails if scraping fails. For MVP demos, consider whether it should fall back to mock dashboard data.
- Next step is to feed normalized `reviews` into the AI analysis pipeline.
