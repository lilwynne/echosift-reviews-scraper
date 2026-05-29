# PR: Remove Legacy Product Hunt Actor Path

## Summary

This cleanup removes the obsolete Product Hunt crawler/deployment path now that EchoSift's Product Hunt ingestion uses the official Product Hunt API v2 GraphQL endpoint. The active multi-source review ingestion flow remains in place for Product Hunt, Apple App Store, and Google Play.

The frontend has been simplified into a lightweight free-only flow with no auth buttons and no model picker.

## What Changed

- Removed the old Product Hunt actor assets:
  - `actors/product-hunt-reviews/`
  - `.github/workflows/deploy-product-hunt-actor.yml`
  - `scripts/deploy-product-hunt-actor.mjs`

- Updated root project scripts:
  - Removed `actor:build`
  - Removed `actor:test`
  - Removed `actor:deploy`
  - Replaced the old helper test command with `test:review-ingestion`

- Renamed active ingestion files to neutral names:
  - `lib/apify-reviews.ts` -> `lib/reviews.ts`
  - `scripts/test-apify-reviews.mjs` -> `scripts/test-review-ingestion.mjs`
  - Updated API route imports accordingly.

- Cleaned active review-ingestion types/config:
  - Removed obsolete `actorId` response field.
  - Removed obsolete actor-era error-code mappings.
  - Removed obsolete actor-era environment-variable fallbacks.
  - Product Hunt still uses `PRODUCT_HUNT_API_TOKEN`.
  - All sources still use `REVIEWS_MAX_REVIEWS` and `REVIEWS_REQUEST_TIMEOUT_MS`.

- Updated user-facing loading copy and branding:
  - Replaced old source-specific pipeline wording with generic review API wording.
  - Renamed the product to EchoSift across the frontend and docs.
  - Removed auth buttons, subscription UI, and model picker from the rendered page.

- Rebuilt the hero's real-time insight preview:
  - idle placeholder card
  - scanning glass overlay with looping scan line
  - reveal cards with spring entrance
  - count-up positive signal metric
  - spring progress bars with glow edge
  - hover spotlight effect on each card

- Updated documentation:
  - `docs/ai-handoff.md`
  - `docs/issue.md`
  - `docs/pr-description.md`

- Improved Chrome extension responsiveness:
  - Removed the content script's full-body MutationObserver and 500ms URL polling.
  - Added event-driven SPA URL detection with a short click-debounced fallback.
  - Added background in-flight request dedupe for repeated clicks on the same URL.
  - Added `chrome.storage.session` success caching with an in-memory fallback.
  - Added a 90-second analysis request timeout and clearer loading copy.
  - Aligned `/api/analyze` default `ANALYSIS_MAX_REVIEWS` to 50.

- Improved App Store ingestion coverage:
  - Kept Apple RSS as the first review source.
  - Added an App Store product-page fallback that parses `serialized-server-data` when RSS returns no reviews.
  - Added `provider: "apple-web-page"` for fallback results.
  - Added a zero-review `/api/analyze` short-circuit so empty ingestion does not spend an AI request.

## Current Environment Variables

Product Hunt only:

```env
PRODUCT_HUNT_API_TOKEN=your_product_hunt_developer_token
```

All sources:

```env
REVIEWS_MAX_REVIEWS=100
REVIEWS_REQUEST_TIMEOUT_MS=120000
ANALYSIS_MAX_REVIEWS=50
ANALYSIS_REVIEW_TEXT_MAX_CHARS=1200
```

## API Notes

`POST /api/reviews`

```json
{
  "url": "https://www.producthunt.com/products/example-product"
}
```

Successful Product Hunt response shape:

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
  "scrapeSource": "product-hunt",
  "reviewCount": 1,
  "reviews": []
}
```

## Testing

Passed locally:

```bash
npm run test:review-ingestion
npm run lint
npm run build
cd extension && npx tsc --noEmit
cd extension && npm run build
```

Build output includes:

```text
ƒ /api/analyze
ƒ /api/reviews
```

Product Hunt GraphQL helper tests cover bearer-token usage, URL slug parsing, comment normalization, cursor pagination, and missing-token handling.

Frontend verification:

- `npm run lint`
- `npm run build`
- `npm run test:analyze-route`
- Browser pass on `http://127.0.0.1:3000` for idle, scanning, and reveal preview states

## Risks / Follow-Ups

- Live Product Hunt validation still needs to be run with a valid `PRODUCT_HUNT_API_TOKEN`.
- Apple RSS can return empty feeds for some app/country combinations; the App Store web fallback only uses review snippets embedded in the public product page HTML and does not paginate all historical reviews.
- Google Play scraping is unofficial and may fail when Google changes markup or blocks the runtime network.
- `/api/analyze` currently fails if scraping fails. For MVP demos, consider whether it should fall back to mock dashboard data.
- Next step is to feed normalized `reviews` into the AI analysis pipeline.
