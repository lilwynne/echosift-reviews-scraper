# Product Hunt Reviews Actor

Self-hosted Apify Actor for FeatureMap's Product Hunt review ingestion.

The actor keeps the current Next.js API contract intact: deploy it to Apify, then set:

```env
APIFY_PRODUCT_HUNT_ACTOR_ID=<your-user>~product-hunt-reviews
```

## Input

Compatible with the existing backend payload:

```json
{
  "start_urls": [{ "url": "https://www.producthunt.com/products/claude" }],
  "max_comments": 100
}
```

`max_comments` defaults to 100 and is capped at 300.
`proxyConfiguration` is optional; enable it only with a proxy group your Apify account can access.

## Output

Each Product Hunt review is pushed as one dataset item with fields already understood by `lib/apify-reviews.ts`:

```json
{
  "source": "product-hunt",
  "id": "stable-review-hash",
  "product_name": "Claude by Anthropic",
  "product_url": "https://www.producthunt.com/products/claude",
  "url": "https://www.producthunt.com/products/claude/reviews",
  "author": "Example User",
  "body": "Review text...",
  "text": "Review text...",
  "created_at": "2mo ago",
  "vote_count": 1,
  "review_type": "founder",
  "views": 166,
  "helpful_count": 1,
  "sections": {
    "great": "What is great...",
    "improvement": "What needs work...",
    "alternatives": "Compared with alternatives..."
  },
  "tags": ["data analysis", "ethical AI"]
}
```

If no public reviews can be extracted, the actor pushes one warning item with `code: "SCRAPE_EMPTY_OR_BLOCKED"` and no `body`, so the existing normalizer ignores it as a review while `rawItems` still contains the diagnostic.

## Metadata enrichment

Set `PRODUCT_HUNT_API_TOKEN` as an Apify actor secret/environment variable to enrich rows with official Product Hunt GraphQL post metadata (`reviewsCount`, `reviewsRating`, `commentsCount`, etc.).

The actor does not use Product Hunt private APIs, login flows, captcha bypassing, or browser automation.

## Local development

From the repo root:

```bash
npm run actor:build
npm run actor:test
```

For a local actor-style run, create:

```text
actors/product-hunt-reviews/storage/key_value_stores/default/INPUT.json
```

Then run from `actors/product-hunt-reviews`:

```bash
npm install
npm run build
npm start
```

Local dataset items are written to `actors/product-hunt-reviews/storage/datasets/default`.
