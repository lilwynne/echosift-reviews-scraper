import assert from "node:assert/strict";
import test from "node:test";
import gplayModule from "google-play-scraper";

const originalEnv = {
  PRODUCT_HUNT_API_TOKEN: process.env.PRODUCT_HUNT_API_TOKEN,
  REVIEWS_MAX_REVIEWS: process.env.REVIEWS_MAX_REVIEWS,
  GOOGLE_PLAY_SCRAPER_THROTTLE: process.env.GOOGLE_PLAY_SCRAPER_THROTTLE
};

const originalFetch = globalThis.fetch;
const originalGplayReviews = gplayModule.reviews;

async function loadModule() {
  return import("../lib/reviews.ts");
}

function restoreEnv() {
  if (originalEnv.PRODUCT_HUNT_API_TOKEN === undefined) {
    delete process.env.PRODUCT_HUNT_API_TOKEN;
  } else {
    process.env.PRODUCT_HUNT_API_TOKEN = originalEnv.PRODUCT_HUNT_API_TOKEN;
  }

  if (originalEnv.REVIEWS_MAX_REVIEWS === undefined) {
    delete process.env.REVIEWS_MAX_REVIEWS;
  } else {
    process.env.REVIEWS_MAX_REVIEWS = originalEnv.REVIEWS_MAX_REVIEWS;
  }

  if (originalEnv.GOOGLE_PLAY_SCRAPER_THROTTLE === undefined) {
    delete process.env.GOOGLE_PLAY_SCRAPER_THROTTLE;
  } else {
    process.env.GOOGLE_PLAY_SCRAPER_THROTTLE =
      originalEnv.GOOGLE_PLAY_SCRAPER_THROTTLE;
  }
}

function restoreGplayReviews() {
  gplayModule.reviews = originalGplayReviews;
}

function assertBrowserJsonHeaders(headers) {
  assert.equal(headers.Accept, "application/json");
  assert.match(headers["User-Agent"], /Mozilla\/5\.0/);
  assert.match(headers["Accept-Language"], /en-US/);
}

test("product hunt requests use the official graphql api and normalize comments", async () => {
  process.env.PRODUCT_HUNT_API_TOKEN = "product-hunt-token";
  process.env.REVIEWS_MAX_REVIEWS = "50";

  let capturedUrl;
  let capturedBody;
  let capturedAuth;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input);
    capturedUrl = url;
    capturedBody = init?.body;
    capturedAuth = init?.headers?.Authorization;

    return {
      ok: true,
      json: async () => ({
        data: {
          post: {
            id: "post-1",
            name: "Claude",
            slug: "claude",
            tagline: "AI assistant",
            url: "https://www.producthunt.com/posts/claude",
            website: "https://claude.ai",
            commentsCount: 1,
            reviewsCount: 0,
            reviewsRating: null,
            votesCount: 123,
            createdAt: "2026-05-01T00:00:00Z",
            featuredAt: "2026-05-02T00:00:00Z",
            comments: {
              nodes: [
                {
                  id: "comment-1",
                  body: "<p>Useful product.</p>",
                  createdAt: "2026-05-03T00:00:00Z",
                  url: "https://www.producthunt.com/posts/claude#comment-1",
                  votesCount: 7,
                  user: {
                    username: "ada",
                    name: "Ada Example"
                  }
                }
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null
              },
              totalCount: 1
            }
          }
        }
      })
    };
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews("https://www.producthunt.com/products/claude");

    assert.equal(result.ok, true);
    assert.equal(capturedUrl, "https://api.producthunt.com/v2/api/graphql");
    assert.equal(capturedAuth, "Bearer product-hunt-token");
    assert.equal(result.provider, "product-hunt-graphql");
    assert.equal(result.product.name, "Claude");
    assert.equal(result.product.votesCount, 123);
    assert.equal(result.reviews[0].text, "Useful product.");
    assert.equal(result.reviews[0].author, "Ada Example");
    assert.equal(result.reviews[0].authorUsername, "ada");
    assert.equal(result.reviews[0].date, "2026-05-03T00:00:00Z");

    const body = JSON.parse(String(capturedBody));
    assert.equal(body.variables.slug, "claude");
    assert.equal(body.variables.first, 50);
    assert.equal(body.variables.after, null);
    assert.match(body.query, /pageInfo/);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("product hunt graphql pagination follows endCursor until complete", async () => {
  process.env.PRODUCT_HUNT_API_TOKEN = "product-hunt-token";
  process.env.REVIEWS_MAX_REVIEWS = "100";

  const afterValues = [];

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    afterValues.push(body.variables.after);
    const isFirstPage = body.variables.after === null;

    return {
      ok: true,
      json: async () => ({
        data: {
          post: {
            id: "post-1",
            name: "Claude",
            slug: "claude",
            tagline: "AI assistant",
            votesCount: 123,
            comments: {
              nodes: [
                {
                  id: isFirstPage ? "comment-1" : "comment-2",
                  body: isFirstPage ? "First page" : "Second page",
                  createdAt: "2026-05-03T00:00:00Z",
                  user: {
                    username: isFirstPage ? "ada" : "grace",
                    name: isFirstPage ? "Ada Example" : "Grace Example"
                  }
                }
              ],
              pageInfo: {
                hasNextPage: isFirstPage,
                endCursor: isFirstPage ? "cursor-1" : null
              },
              totalCount: 2
            }
          }
        }
      })
    };
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews("https://www.producthunt.com/products/claude");

    assert.equal(result.ok, true);
    assert.deepEqual(afterValues, [null, "cursor-1"]);
    assert.equal(result.count, 2);
    assert.equal(result.reviews[0].text, "First page");
    assert.equal(result.reviews[1].text, "Second page");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("product hunt maxReviews option overrides env limit and stops pagination", async () => {
  process.env.PRODUCT_HUNT_API_TOKEN = "product-hunt-token";
  process.env.REVIEWS_MAX_REVIEWS = "100";

  const requestedVariables = [];

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    requestedVariables.push(body.variables);

    return {
      ok: true,
      json: async () => ({
        data: {
          post: {
            id: "post-1",
            name: "Claude",
            slug: "claude",
            tagline: "AI assistant",
            votesCount: 123,
            comments: {
              nodes: [
                {
                  id: "comment-1",
                  body: "Only requested review",
                  createdAt: "2026-05-03T00:00:00Z",
                  user: {
                    username: "ada",
                    name: "Ada Example"
                  }
                }
              ],
              pageInfo: {
                hasNextPage: true,
                endCursor: "cursor-1"
              },
              totalCount: 2
            }
          }
        }
      })
    };
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews(
      "https://www.producthunt.com/products/claude",
      {
        maxReviews: 1
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.count, 1);
    assert.equal(result.reviews[0].text, "Only requested review");
    assert.deepEqual(requestedVariables, [
      {
        slug: "claude",
        first: 1,
        after: null
      }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("product hunt requests require the official developer token", async () => {
  delete process.env.PRODUCT_HUNT_API_TOKEN;

  let fetchCalled = false;

  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews("https://www.producthunt.com/products/claude");

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "MISSING_PRODUCT_HUNT_API_TOKEN");
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("app store slug urls resolve the app id before fetching rss reviews", async () => {
  process.env.REVIEWS_MAX_REVIEWS = "50";

  const requestedUrls = [];
  const requestedHeaders = [];

  globalThis.fetch = async (input, init) => {
    const url = input instanceof URL ? input.toString() : String(input);
    requestedUrls.push(url);
    requestedHeaders.push(init?.headers);

    if (url.startsWith("https://itunes.apple.com/search")) {
      const parsedUrl = new URL(url);

      assert.equal(parsedUrl.searchParams.get("term"), "soul");
      assert.equal(parsedUrl.searchParams.get("country"), "cn");
      assert.equal(parsedUrl.searchParams.get("entity"), "software");

      return {
        ok: true,
        json: async () => ({
          resultCount: 1,
          results: [
            {
              trackId: 123456789,
              trackName: "Soul",
              bundleId: "cn.soulapp"
            }
          ]
        })
      };
    }

    assert.equal(
      url,
      "https://itunes.apple.com/cn/rss/customerreviews/page=1/id=123456789/sortby=mostrecent/json"
    );

    return {
      ok: true,
      json: async () => ({
        feed: {
          entry: [
            {
              id: {
                label: "review-1"
              },
              title: {
                label: "Nice app"
              },
              content: {
                label: "Fast matching and clear notifications."
              },
              author: {
                name: {
                  label: "Ada"
                }
              },
              updated: {
                label: "2026-05-20T00:00:00Z"
              }
            }
          ]
        }
      })
    };
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews("https://apps.apple.com/cn/app/soul/");

    assert.equal(result.ok, true);
    assert.equal(result.provider, "apple-rss");
    assert.equal(result.count, 1);
    assert.equal(result.reviews[0].source, "app-store");
    assert.equal(result.reviews[0].text, "Fast matching and clear notifications.");
    assert.deepEqual(requestedUrls, [
      "https://itunes.apple.com/search?term=soul&country=cn&entity=software&limit=1",
      "https://itunes.apple.com/cn/rss/customerreviews/page=1/id=123456789/sortby=mostrecent/json"
    ]);
    assert.equal(requestedHeaders.length, 2);
    assertBrowserJsonHeaders(requestedHeaders[0]);
    assertBrowserJsonHeaders(requestedHeaders[1]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("google play reviews pass browser headers, content type, and throttle", async () => {
  process.env.GOOGLE_PLAY_SCRAPER_THROTTLE = "7";

  let capturedOptions;

  gplayModule.reviews = async (options) => {
    capturedOptions = options;

    return {
      data: [
        {
          id: "review-1",
          text: "Helpful release notes and quick updates.",
          title: "Useful",
          userName: "Ada",
          score: 5,
          date: "2026-05-20",
          thumbsUp: 9
        }
      ]
    };
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews(
      "https://play.google.com/store/apps/details?id=com.example.app&hl=ja&gl=jp",
      {
        maxReviews: 3
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.provider, "google-play-scraper");
    assert.equal(result.count, 1);
    assert.equal(result.reviews[0].source, "google-play");
    assert.equal(result.reviews[0].text, "Helpful release notes and quick updates.");
    assert.equal(capturedOptions.appId, "com.example.app");
    assert.equal(capturedOptions.num, 3);
    assert.equal(capturedOptions.lang, "ja");
    assert.equal(capturedOptions.country, "jp");
    assert.equal(capturedOptions.throttle, 7);
    assert.equal(
      capturedOptions.requestOptions.headers["Content-Type"],
      "application/x-www-form-urlencoded;charset=UTF-8"
    );
    assert.match(capturedOptions.requestOptions.headers["User-Agent"], /Mozilla\/5\.0/);
    assert.match(capturedOptions.requestOptions.headers["Accept-Language"], /en-US/);
  } finally {
    restoreGplayReviews();
    restoreEnv();
  }
});

test("google play reviews use the default throttle", async () => {
  delete process.env.GOOGLE_PLAY_SCRAPER_THROTTLE;

  let capturedOptions;

  gplayModule.reviews = async (options) => {
    capturedOptions = options;

    return {
      data: []
    };
  };

  try {
    const { fetchReviews } = await loadModule();
    const result = await fetchReviews(
      "https://play.google.com/store/apps/details?id=com.example.app"
    );

    assert.equal(result.ok, true);
    assert.equal(capturedOptions.throttle, 10);
  } finally {
    restoreGplayReviews();
    restoreEnv();
  }
});

test("google play blocked responses return a clear scrape error code", async () => {
  const blockedErrors = [
    Object.assign(new Error("Error requesting Google Play: Service Unavailable"), {
      status: 503
    }),
    Object.assign(new Error("Error requesting Google Play: Too Many Requests"), {
      status: 429
    }),
    new Error("Captcha challenge detected"),
    new Error("Request blocked by upstream"),
    new Error("too many requests")
  ];

  try {
    const { fetchReviews } = await loadModule();
    const { statusFromScrapeErrorCode } = await import("../lib/api-errors.ts");

    for (const blockedError of blockedErrors) {
      gplayModule.reviews = async () => {
        throw blockedError;
      };

      const result = await fetchReviews(
        "https://play.google.com/store/apps/details?id=com.example.app"
      );

      assert.equal(result.ok, false);
      assert.equal(result.error.code, "GOOGLE_PLAY_SCRAPE_BLOCKED");
      assert.equal(statusFromScrapeErrorCode(result.error.code), 503);
    }
  } finally {
    restoreGplayReviews();
    restoreEnv();
  }
});

test("invalid app store urls fail as bad requests instead of upstream errors", async () => {
  let fetchCalled = false;

  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called");
  };

  try {
    const { fetchReviews } = await loadModule();
    const { statusFromScrapeErrorCode } = await import("../lib/api-errors.ts");
    const result = await fetchReviews("https://apps.apple.com/cn/developer/soul/");

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "INVALID_REVIEW_SOURCE_URL");
    assert.equal(statusFromScrapeErrorCode(result.error.code), 400);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test("missing product hunt token maps to service unavailable", async () => {
  const { statusFromScrapeErrorCode } = await import("../lib/api-errors.ts");

  assert.equal(
    statusFromScrapeErrorCode("MISSING_PRODUCT_HUNT_API_TOKEN"),
    503
  );
});
