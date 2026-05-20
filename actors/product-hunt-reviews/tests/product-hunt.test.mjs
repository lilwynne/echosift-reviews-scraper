import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildReviewPageUrls,
  normalizeProductHuntUrl,
  parseReviewsFromHtml,
  scrapeProductHuntReviews
} from "../dist/product-hunt.js";

const fixture = await readFile(
  new URL("./fixtures/claude-reviews.sample.html", import.meta.url),
  "utf8"
);

test("normalizes Product Hunt product and reviews URLs", () => {
  const normalized = normalizeProductHuntUrl(
    "https://www.producthunt.com/products/claude/reviews?filter=founder"
  );

  assert.equal(normalized.slug, "claude");
  assert.equal(normalized.productUrl, "https://www.producthunt.com/products/claude");
  assert.equal(
    normalized.reviewsUrl,
    "https://www.producthunt.com/products/claude/reviews"
  );
  assert.deepEqual(buildReviewPageUrls(normalized.reviewsUrl), [
    "https://www.producthunt.com/products/claude/reviews",
    "https://www.producthunt.com/products/claude/reviews?filter=founder",
    "https://www.producthunt.com/products/claude/reviews?feed=single&filter=all"
  ]);
});

test("parses review cards and drops duplicate cards", () => {
  const reviews = parseReviewsFromHtml(fixture, {
    sourceUrl: "https://www.producthunt.com/products/claude",
    productUrl: "https://www.producthunt.com/products/claude",
    reviewsUrl: "https://www.producthunt.com/products/claude/reviews"
  });

  assert.equal(reviews.length, 2);
  assert.equal(reviews[0].source, "product-hunt");
  assert.equal(reviews[0].product_name, "Claude by Anthropic");
  assert.equal(reviews[0].author, "Felipe Daguila");
  assert.equal(reviews[0].review_type, "founder");
  assert.equal(reviews[0].helpful_count, 1);
  assert.equal(reviews[0].views, 166);
  assert.equal(reviews[0].created_at, "2mo ago");
  assert.match(reviews[0].body ?? "", /Claude was my CPO/);
  assert.deepEqual(reviews[0].tags, ["data analysis", "ethical AI"]);

  assert.equal(reviews[1].author, "Shubham Jain");
  assert.equal(reviews[1].review_type, "other");
  assert.equal(reviews[1].helpful_count, 0);
  assert.equal(reviews[1].views, 18);
  assert.match(reviews[1].sections?.improvement ?? "", /message limits/);
});

test("scrape workflow deduplicates pages and respects max_comments", async () => {
  const result = await scrapeProductHuntReviews(
    "https://www.producthunt.com/products/claude",
    {
      max_comments: 1,
      start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
    },
    {
      productHuntApiToken: undefined,
      minDelayMs: 0,
      maxDelayMs: 0,
      fetchHtml: async () => fixture
    }
  );

  assert.equal(result.reviews.length, 1);
  assert.equal(result.metadataWarning?.includes("PRODUCT_HUNT_API_TOKEN"), true);
  assert.equal(result.scrapeWarnings.length, 0);
});
