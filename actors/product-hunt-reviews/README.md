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
  "max_comments": 100,
  "max_page_retries": 2,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  },
  "productHuntApiToken": "your_product_hunt_developer_token"
}
```

`max_comments` defaults to 100 and is capped at 300.
`max_page_retries` defaults to 2 and is capped at 5.
`proxyConfiguration` should use a residential Apify Proxy group for Product Hunt. If it is omitted during an Apify run and `APIFY_PROXY_PASSWORD` is present, the actor automatically attempts `RESIDENTIAL`; set `"useApifyProxy": false` only for local debugging or accounts without proxy access. If Apify Proxy is configured but the runtime does not expose `APIFY_PROXY_PASSWORD`, the actor logs an explicit warning and requests run without Apify Proxy.
`productHuntApiToken` is optional and only enriches rows with official Product Hunt GraphQL metadata. The actor still scrapes public reviews without it. The actor also accepts `PRODUCT_HUNT_API_TOKEN` and `APIFY_PRODUCT_HUNT_API_TOKEN` for local/manual runs.

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

Extraction order:

1. Fetch the public review page with browser-like headers and Apify Proxy when configured.
2. Render the page in Playwright when the raw HTML is a challenge page or otherwise unparseable.
3. Scroll the rendered page to trigger lazy-loaded review content.
4. Retry blocked or empty pages with a fresh proxy session.
5. Parse structured JSON from `__NEXT_DATA__`, Next flight chunks, or Apollo SSR payloads first.
6. Fall back to the legacy DOM-text segment parser for older page shapes.

## Metadata enrichment

When the actor is called by the backend, `productHuntApiToken` is passed in the input payload when `PRODUCT_HUNT_API_TOKEN` exists. For local/manual runs, you can still set `PRODUCT_HUNT_API_TOKEN` or `APIFY_PRODUCT_HUNT_API_TOKEN` as environment variables to enrich rows with official Product Hunt GraphQL post metadata (`reviewsCount`, `reviewsRating`, `commentsCount`, etc.).

If no token is provided, the actor still scrapes public reviews and logs one warning per run.

`Product Hunt metadata request was rejected` or HTTP 401/403 means the Product Hunt API rejected the token used only for GraphQL metadata enrichment. Generate a fresh Developer Token or OAuth access token from the Product Hunt API dashboard, then pass it as `productHuntApiToken`. Public review scraping will still continue without metadata when this request fails.

The actor does not use Product Hunt private APIs or login flows. It does use browser rendering and Apify Proxy session rotation as fallbacks when the public HTML response is a challenge page or otherwise unparseable.

## Why other Product Hunt actors may work

Product Hunt is behind Cloudflare. A normal Playwright browser from a cloud datacenter IP can still receive a challenge page, which is what your log shows. Working Product Hunt actors usually combine a real browser with Apify Proxy, a residential proxy group, sticky sessions, and retry/session rotation. This actor now follows that pattern. If the Apify account cannot access the selected proxy group, the run will still be blocked; switch `apifyProxyGroups` to a group your account can use.

## Local development

From the repo root:

```bash
npm run actor:build
npm run actor:test
```

## Deployment

From the repo root, deploy the actor with:

```bash
APIFY_TOKEN=your_apify_token npm run actor:deploy
```

`APIFY_API_TOKEN` is also accepted. The script runs `npm run actor:test`, then deploys `actors/product-hunt-reviews` to `feature_map/product-hunt-reviews` via Apify CLI. Override the target with `APIFY_PRODUCT_HUNT_ACTOR_ID`; pass `-- --skip-tests` only when tests were already run in the same build.

GitHub Actions can deploy automatically on changes under `actors/product-hunt-reviews/**` after adding an `APIFY_TOKEN` or `APIFY_API_TOKEN` repository secret. The workflow is `.github/workflows/deploy-product-hunt-actor.yml`.

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
