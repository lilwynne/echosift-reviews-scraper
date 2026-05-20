# PR: Add App Store and Google Play Review Scraping

## Summary

This PR expands FeatureMap's review-ingestion backend beyond Product Hunt. Product Hunt still uses Apify and now has a self-built actor scaffold/deployment, while Apple App Store uses Apple's public RSS feed and Google Play uses `google-play-scraper`.

The approved frontend UI was intentionally left unchanged.

## What Changed

- Updated `lib/apify-reviews.ts`
  - Keeps the public `fetchReviews(url)` API.
  - Detects Product Hunt, App Store, and Google Play links.
  - Keeps Product Hunt on Apify with actor override support.
  - Fetches App Store reviews from Apple RSS with app id and country parsing.
  - Fetches Google Play reviews with `google-play-scraper`.
  - Normalizes all sources into `NormalizedReview[]`.
  - Adds `provider` and makes `actorId` Product Hunt-specific.
  - Adds generic review fetch errors for timeout/network/failure cases.

- Updated `lib/api-errors.ts`
  - Maps new generic review error codes to HTTP 502/504 responses.

- Updated `scripts/test-reviews.mjs`
  - Defaults to an App Store link so the test script no longer requires Apify credentials unless a Product Hunt URL is provided.

- Added `actors/product-hunt-reviews`
  - Self-built Product Hunt reviews Apify actor using Node/TypeScript and HTTP/HTML parsing.
  - Compatible with the backend's existing Product Hunt actor input shape.
  - Deployed privately as `feature_map/product-hunt-reviews` (`xHkiWaZEikt9m0kBy`).
  - Defaults proxy usage off because this Apify account cannot access `DATACENTER`.
  - Uses Apify cloud env vars `ACTOR_DEFAULT_KEY_VALUE_STORE_ID`, `ACTOR_INPUT_KEY`, and `ACTOR_DEFAULT_DATASET_ID` for input/output storage.

- Updated dependencies
  - Added `google-play-scraper`.

- Updated documentation
  - `docs/ai-handoff.md`
  - `docs/issue.md`
  - `docs/pr-description.md`

## Environment Variables

Product Hunt only:

```env
APIFY_API_TOKEN=your_apify_api_token
APIFY_PRODUCT_HUNT_ACTOR_ID=feature_map/product-hunt-reviews
APIFY_RUN_TIMEOUT_SECS=120
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
  "source": "app-store",
  "sourceUrl": "https://apps.apple.com/us/app/facebook/id284882215",
  "provider": "apple-rss",
  "count": 0,
  "reviews": [],
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

Passed:

```bash
npm run lint
npm run build
npm run actor:test
```

Build output includes:

```text
ƒ /api/analyze
ƒ /api/reviews
```

Smoke-test notes:

- App Store local API route returned 200 JSON, but Apple RSS returned an empty feed for tested app/country combinations in this environment.
- Google Play local API route returned a friendly error when Google Play timed out from this environment.
- Product Hunt self-built actor was deployed successfully to Apify, build `0.1.3 / latest`.
- Product Hunt actor now starts and reads input in Apify cloud.
- Product Hunt live smoke test against `https://www.producthunt.com/products/claude` returned `SCRAPE_EMPTY_OR_BLOCKED` with zero reviews.
- Product Hunt proxy smoke test using account group `BUYPROXIES94952` returned `fetch failed` for Product Hunt pages.

## Risks / Follow-Ups

- Product Hunt actor deployment is complete, but real Product Hunt review extraction is not yet validated. The next step is to inspect live fetched HTML/run logs and adjust parser/proxy strategy.
- Do not default the actor to `DATACENTER` proxy for this account; it is not available.
- Apple RSS can return empty feeds for some app/country combinations.
- Google Play scraping is unofficial and may fail when Google changes markup or blocks the runtime network.
- `/api/analyze` currently fails if scraping fails. For MVP demos, consider whether it should fall back to mock dashboard data.
- Next step is to feed normalized `reviews` into the AI analysis pipeline.
