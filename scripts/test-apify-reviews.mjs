import assert from "node:assert/strict";
import test from "node:test";

const originalEnv = {
  PRODUCT_HUNT_API_TOKEN: process.env.PRODUCT_HUNT_API_TOKEN,
  REVIEWS_MAX_REVIEWS: process.env.REVIEWS_MAX_REVIEWS
};

const originalFetch = globalThis.fetch;

async function loadModule() {
  return import("../lib/apify-reviews.ts");
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
