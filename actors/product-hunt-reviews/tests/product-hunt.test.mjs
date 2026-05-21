import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildReviewPageUrls,
  buildEmptyOrBlockedItem,
  normalizeProductHuntUrl,
  parseReviewsFromHtml,
  resolveProductHuntApiToken,
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
  assert.equal(reviews[0].metadata_warning, undefined);
});

test("parses Product Hunt reviews from embedded structured page data", () => {
  const html = `<!doctype html>
    <html>
      <head>
        <title>Claude by Anthropic Reviews | Product Hunt</title>
        <script id="__NEXT_DATA__" type="application/json">
          {
            "props": {
              "pageProps": {
                "product": {
                  "name": "Claude by Anthropic",
                  "reviews": {
                    "edges": [
                      {
                        "node": {
                          "id": "review-1",
                          "body": "Claude understands long product specs better than anything else I have tried.",
                          "createdAt": "2026-05-01T00:00:00Z",
                          "helpfulCount": 7,
                          "views": "1.2K",
                          "rating": 5,
                          "whatIsGreat": "Long context and careful product reasoning.",
                          "whatNeedsImprovement": "The usage limits still interrupt deep work.",
                          "user": {
                            "name": "Ada Example"
                          },
                          "product": {
                            "name": "Claude by Anthropic",
                            "url": "/products/claude"
                          },
                          "tags": [
                            { "name": "AI assistant" },
                            "productivity"
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        </script>
      </head>
      <body><main></main></body>
    </html>`;
  const reviews = parseReviewsFromHtml(html, {
    sourceUrl: "https://www.producthunt.com/products/claude",
    productUrl: "https://www.producthunt.com/products/claude",
    reviewsUrl: "https://www.producthunt.com/products/claude/reviews"
  });

  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].id, "review-1");
  assert.equal(reviews[0].author, "Ada Example");
  assert.equal(reviews[0].product_name, "Claude by Anthropic");
  assert.equal(reviews[0].product_url, "https://www.producthunt.com/products/claude");
  assert.equal(reviews[0].helpful_count, 7);
  assert.equal(reviews[0].views, 1200);
  assert.equal(reviews[0].rating, 5);
  assert.deepEqual(reviews[0].tags, ["AI assistant", "productivity"]);
  assert.match(reviews[0].body ?? "", /long product specs/);
  assert.match(reviews[0].sections?.improvement ?? "", /usage limits/);
});

test("resolves Product Hunt api token from explicit value and environment fallbacks", () => {
  const originalPrimary = process.env.PRODUCT_HUNT_API_TOKEN;
  const originalApify = process.env.APIFY_PRODUCT_HUNT_API_TOKEN;

  try {
    process.env.PRODUCT_HUNT_API_TOKEN = "  primary-token  ";
    process.env.APIFY_PRODUCT_HUNT_API_TOKEN = "fallback-token";
    assert.equal(resolveProductHuntApiToken().token, "primary-token");

    delete process.env.PRODUCT_HUNT_API_TOKEN;
    assert.equal(resolveProductHuntApiToken().token, "fallback-token");

    assert.equal(resolveProductHuntApiToken("  explicit-token  ").token, "explicit-token");
    assert.equal(resolveProductHuntApiToken("explicit-token").token, "explicit-token");
  } finally {
    if (originalPrimary === undefined) {
      delete process.env.PRODUCT_HUNT_API_TOKEN;
    } else {
      process.env.PRODUCT_HUNT_API_TOKEN = originalPrimary;
    }

    if (originalApify === undefined) {
      delete process.env.APIFY_PRODUCT_HUNT_API_TOKEN;
    } else {
      process.env.APIFY_PRODUCT_HUNT_API_TOKEN = originalApify;
    }
  }
});

test("empty result diagnostics keep metadata warning", () => {
  const item = buildEmptyOrBlockedItem(
    {
      slug: "claude",
      sourceUrl: "https://www.producthunt.com/products/claude",
      productUrl: "https://www.producthunt.com/products/claude",
      reviewsUrl: "https://www.producthunt.com/products/claude/reviews"
    },
    "Claude by Anthropic",
    undefined,
    "Product Hunt API token is not configured; official metadata enrichment was skipped.",
    []
  );

  assert.equal(item.code, "SCRAPE_EMPTY_OR_BLOCKED");
  assert.equal(item.metadata_warning?.includes("Product Hunt API token"), true);
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
  assert.equal(result.metadataWarning?.includes("Product Hunt API token"), true);
  assert.equal(result.scrapeWarnings.length, 1);
  assert.match(result.scrapeWarnings[0], /running without a proxy/);
});

test("scrape workflow records diagnostics when fetched HTML has no review markers after retries", async () => {
  const result = await scrapeProductHuntReviews(
    "https://www.producthunt.com/products/claude",
    {
      max_comments: 1,
      max_page_retries: 0,
      start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
    },
    {
      productHuntApiToken: undefined,
      minDelayMs: 0,
      maxDelayMs: 0,
      fetchHtml: async () => "<html><title>Claude Reviews | Product Hunt</title><main></main></html>"
    }
  );

  assert.equal(result.reviews.length, 0);
  assert.equal(result.scrapeWarnings.length, 4);
  assert.match(result.scrapeWarnings[0], /running without a proxy/);
  assert.match(result.scrapeWarnings[1], /attempt 1/);
  assert.match(result.scrapeWarnings[1], /No Product Hunt review markers/);
});

test("scrape workflow records Cloudflare challenge diagnostics after retries", async () => {
  const result = await scrapeProductHuntReviews(
    "https://www.producthunt.com/products/claude",
    {
      max_comments: 1,
      max_page_retries: 0,
      start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
    },
    {
      productHuntApiToken: undefined,
      minDelayMs: 0,
      maxDelayMs: 0,
      fetchHtml: async () =>
        "<html><head><title>Just a moment...</title></head><body><script src='/cdn-cgi/challenge-platform/test'></script></body></html>"
    }
  );

  assert.equal(result.reviews.length, 0);
  assert.equal(result.scrapeWarnings.length, 4);
  assert.match(result.scrapeWarnings[0], /running without a proxy/);
  assert.match(result.scrapeWarnings[1], /attempt 1/);
  assert.match(result.scrapeWarnings[1], /Cloudflare challenge/);
});

test("scrape workflow clarifies when configured proxy is still challenged", async () => {
  const originalProxyPassword = process.env.APIFY_PROXY_PASSWORD;

  try {
    process.env.APIFY_PROXY_PASSWORD = "proxy-password";

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        max_page_retries: 0,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        },
        start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
      },
      {
        productHuntApiToken: undefined,
        minDelayMs: 0,
        maxDelayMs: 0,
        fetchHtml: async () =>
          "<html><head><title>Just a moment...</title></head><body><script src='/cdn-cgi/challenge-platform/test'></script></body></html>"
      }
    );

    assert.equal(result.reviews.length, 0);
    assert.match(result.scrapeWarnings[0], /configured proxy was still challenged/);
  } finally {
    if (originalProxyPassword === undefined) {
      delete process.env.APIFY_PROXY_PASSWORD;
    } else {
      process.env.APIFY_PROXY_PASSWORD = originalProxyPassword;
    }
  }
});

test("scrape workflow warns when Apify proxy is configured but unavailable", async () => {
  const originalProxyPassword = process.env.APIFY_PROXY_PASSWORD;

  try {
    delete process.env.APIFY_PROXY_PASSWORD;

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        },
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
    assert.match(result.scrapeWarnings[0], /APIFY_PROXY_PASSWORD is unavailable/);
  } finally {
    if (originalProxyPassword === undefined) {
      delete process.env.APIFY_PROXY_PASSWORD;
    } else {
      process.env.APIFY_PROXY_PASSWORD = originalProxyPassword;
    }
  }
});

test("scrape workflow renders review pages when raw fetch returns a challenge", async () => {
  const fetchedUrls = [];
  const renderedUrls = [];
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
      fetchHtml: async (url) => {
        fetchedUrls.push(url);
        return "<html><head><title>Just a moment...</title></head><body><script src='/cdn-cgi/challenge-platform/test'></script></body></html>";
      },
      renderHtml: async (url, proxyConfiguration, requestTimeoutMs, attempt) => {
        assert.equal(proxyConfiguration, undefined);
        assert.equal(requestTimeoutMs, 45_000);
        assert.equal(attempt?.attempt, 1);
        renderedUrls.push(url);
        return fixture;
      }
    }
  );

  assert.equal(result.reviews.length, 1);
  assert.equal(fetchedUrls.length, 1);
  assert.deepEqual(renderedUrls, [
    "https://www.producthunt.com/products/claude/reviews"
  ]);
  assert.equal(result.scrapeWarnings.length, 1);
  assert.match(result.scrapeWarnings[0], /running without a proxy/);
});

test("scrape workflow renders review pages when raw fetch has no review markers", async () => {
  const renderedUrls = [];
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
      fetchHtml: async () =>
        "<html><title>Claude Reviews | Product Hunt</title><main></main></html>",
      renderHtml: async (url) => {
        renderedUrls.push(url);
        return fixture;
      }
    }
  );

  assert.equal(result.reviews.length, 1);
  assert.deepEqual(renderedUrls, [
    "https://www.producthunt.com/products/claude/reviews"
  ]);
  assert.equal(result.scrapeWarnings.length, 1);
  assert.match(result.scrapeWarnings[0], /running without a proxy/);
});

test("scrape workflow uses residential Apify proxy by default on Apify runs", async () => {
  const originalFetch = globalThis.fetch;
  const originalProxyPassword = process.env.APIFY_PROXY_PASSWORD;
  const seenDispatchers = [];

  try {
    process.env.APIFY_PROXY_PASSWORD = "proxy-password";

    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.includes("api.producthunt.com")) {
        return {
          ok: true,
          json: async () => ({ data: { post: null } })
        };
      }

      seenDispatchers.push(init?.dispatcher);
      return {
        ok: true,
        text: async () => fixture
      };
    };

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
      },
      {
        minDelayMs: 0,
        maxDelayMs: 0
      }
    );

    assert.equal(result.reviews.length, 1);
    assert.ok(seenDispatchers[0]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalProxyPassword === undefined) {
      delete process.env.APIFY_PROXY_PASSWORD;
    } else {
      process.env.APIFY_PROXY_PASSWORD = originalProxyPassword;
    }
  }
});

test("scrape workflow does not use Apify proxy when explicitly disabled", async () => {
  const originalFetch = globalThis.fetch;
  const originalProxyPassword = process.env.APIFY_PROXY_PASSWORD;
  const seenDispatchers = [];

  try {
    process.env.APIFY_PROXY_PASSWORD = "proxy-password";

    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.includes("api.producthunt.com")) {
        return {
          ok: true,
          json: async () => ({ data: { post: null } })
        };
      }

      seenDispatchers.push(init?.dispatcher);
      return {
        ok: true,
        text: async () => fixture
      };
    };

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        proxyConfiguration: {
          useApifyProxy: false
        },
        start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
      },
      {
        minDelayMs: 0,
        maxDelayMs: 0
      }
    );

    assert.equal(result.reviews.length, 1);
    assert.equal(seenDispatchers[0], undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalProxyPassword === undefined) {
      delete process.env.APIFY_PROXY_PASSWORD;
    } else {
      process.env.APIFY_PROXY_PASSWORD = originalProxyPassword;
    }
  }
});

test("scrape workflow retries blocked pages with fresh attempts", async () => {
  const originalProxyPassword = process.env.APIFY_PROXY_PASSWORD;
  const renderedAttempts = [];

  try {
    process.env.APIFY_PROXY_PASSWORD = "proxy-password";

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        max_page_retries: 2,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        },
        start_urls: [{ url: "https://www.producthunt.com/products/claude" }]
      },
      {
        productHuntApiToken: undefined,
        minDelayMs: 0,
        maxDelayMs: 0,
        fetchHtml: async () =>
          "<html><head><title>Just a moment...</title></head><body><script src='/cdn-cgi/challenge-platform/test'></script></body></html>",
        renderHtml: async (_url, _proxyConfiguration, _requestTimeoutMs, attempt) => {
          renderedAttempts.push(attempt);

          if (attempt?.attempt === 1) {
            return "<html><head><title>Just a moment...</title></head><body><script src='/cdn-cgi/challenge-platform/test'></script></body></html>";
          }

          return fixture;
        }
      }
    );

    assert.equal(result.reviews.length, 1);
    assert.equal(renderedAttempts.length, 2);
    assert.equal(renderedAttempts[0].attempt, 1);
    assert.equal(renderedAttempts[1].attempt, 2);
    assert.notEqual(renderedAttempts[0].sessionId, renderedAttempts[1].sessionId);
    assert.equal(result.scrapeWarnings.length, 0);
  } finally {
    if (originalProxyPassword === undefined) {
      delete process.env.APIFY_PROXY_PASSWORD;
    } else {
      process.env.APIFY_PROXY_PASSWORD = originalProxyPassword;
    }
  }
});

test("scrape workflow prefers explicit token over env fallback", async () => {
  const originalPrimary = process.env.PRODUCT_HUNT_API_TOKEN;
  const originalApify = process.env.APIFY_PRODUCT_HUNT_API_TOKEN;
  const originalFetch = globalThis.fetch;

  try {
    process.env.PRODUCT_HUNT_API_TOKEN = "env-token";
    process.env.APIFY_PRODUCT_HUNT_API_TOKEN = "legacy-token";

    let seenAccept;
    let seenAuthorization;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.includes("api.producthunt.com")) {
        const headers = init?.headers;
        seenAccept =
          headers?.Accept ??
          headers?.accept ??
          headers?.get?.("Accept") ??
          headers?.get?.("accept");
        seenAuthorization =
          headers?.Authorization ??
          headers?.authorization ??
          headers?.get?.("Authorization") ??
          headers?.get?.("authorization");
        return {
          ok: true,
          json: async () => ({ data: { post: null } })
        };
      }

      return {
        ok: true,
        text: async () => fixture
      };
    };

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        proxyConfiguration: {
          useApifyProxy: false
        },
        start_urls: [{ url: "https://www.producthunt.com/products/claude" }],
        productHuntApiToken: "explicit-token"
      },
      {
        minDelayMs: 0,
        maxDelayMs: 0,
        fetchHtml: async () => fixture
      }
    );

    assert.equal(result.reviews.length, 1);
    assert.equal(seenAccept, "application/json");
    assert.equal(seenAuthorization, "Bearer explicit-token");
    assert.equal(result.scrapeWarnings.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalPrimary === undefined) {
      delete process.env.PRODUCT_HUNT_API_TOKEN;
    } else {
      process.env.PRODUCT_HUNT_API_TOKEN = originalPrimary;
    }

    if (originalApify === undefined) {
      delete process.env.APIFY_PRODUCT_HUNT_API_TOKEN;
    } else {
      process.env.APIFY_PRODUCT_HUNT_API_TOKEN = originalApify;
    }
  }
});

test("scrape workflow treats Product Hunt metadata auth failures as non-fatal warnings", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.includes("api.producthunt.com")) {
        return {
          ok: false,
          status: 401
        };
      }

      return {
        ok: true,
        text: async () => fixture
      };
    };

    const result = await scrapeProductHuntReviews(
      "https://www.producthunt.com/products/claude",
      {
        max_comments: 1,
        proxyConfiguration: {
          useApifyProxy: false
        },
        start_urls: [{ url: "https://www.producthunt.com/products/claude" }],
        productHuntApiToken: "invalid-token"
      },
      {
        minDelayMs: 0,
        maxDelayMs: 0,
        fetchHtml: async () => fixture
      }
    );

    assert.equal(result.reviews.length, 1);
    assert.match(result.metadataWarning ?? "", /metadata request was rejected/);
    assert.equal(result.scrapeWarnings.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
