import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalEnv = {
  ANALYSIS_CACHE_TTL_SECONDS: process.env.ANALYSIS_CACHE_TTL_SECONDS,
  ANALYSIS_CONCURRENCY_LIMIT: process.env.ANALYSIS_CONCURRENCY_LIMIT,
  ANALYZE_RATE_LIMIT_MAX_REQUESTS: process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS,
  ANALYZE_RATE_LIMIT_WINDOW_MS: process.env.ANALYZE_RATE_LIMIT_WINDOW_MS
};

const {
  __resetApiGuardsForTest,
  checkRateLimit,
  createAnalysisCacheKey,
  getAnalysisConcurrencyLimit,
  getAnalyzeRateLimitConfig,
  getClientIp,
  normalizeAnalysisUrl,
  tryAcquireAnalysisSlot
} = await import("../lib/api-guards.ts");

const {
  __clearAnalysisCacheForTest,
  getAnalysisCacheTtlMs,
  getCachedAnalysis,
  setCachedAnalysis
} = await import("../lib/analysis-cache.ts");

const sampleAnalysisResponse = {
  sourceUrl: "https://example.com/product",
  language: "zh-CN",
  scrapeSource: "app-store",
  reviewCount: 1,
  reviews: [
    {
      snippetId: "app-store:review-1:1",
      reviewIndex: 1,
      id: "review-1",
      source: "app-store",
      text: "通知有时延迟。",
      rating: 2
    }
  ],
  evidence: {
    painPoints: [["app-store:review-1:1"]],
    featureRequests: [["app-store:review-1:1"]],
    typicalVoices: {
      positive: ["app-store:review-1:1"],
      neutral: ["app-store:review-1:1"],
      negative: ["app-store:review-1:1"]
    }
  },
  analysis: {
    insightPreview: {
      comprehensiveScore: 90,
      coreSummary: "用户喜欢速度，但希望通知更稳定"
    },
    coreMetrics: {
      totalReviews: 1,
      highValueSignals: 1,
      signalCluster: "通知稳定性",
      positiveRatio: 80,
      positiveFocus: "速度"
    },
    emotionDistribution: {
      positive: 80,
      neutral: 10,
      negative: 10
    },
    deepInsights: {
      highFreqPainPoints: ["通知偶发延迟"],
      featureRequests: ["提升通知稳定性"],
      painPointEvidenceReviewIndexes: [[1]],
      featureRequestEvidenceReviewIndexes: [[1]]
    },
    typicalVoices: {
      positive: "速度很快。",
      neutral: "整体还行。",
      negative: "通知有时延迟。"
    },
    typicalVoiceEvidenceReviewIndexes: {
      positive: [1],
      neutral: [1],
      negative: [1]
    }
  }
};

function restoreEnv() {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

afterEach(() => {
  __resetApiGuardsForTest();
  __clearAnalysisCacheForTest();
  restoreEnv();
});

test("getClientIp uses proxy headers in priority order", () => {
  assert.equal(
    getClientIp(
      new Headers({
        "cf-connecting-ip": "203.0.113.1",
        "x-forwarded-for": "203.0.113.2, 203.0.113.3",
        "x-real-ip": "203.0.113.4"
      })
    ),
    "203.0.113.1"
  );
  assert.equal(
    getClientIp(
      new Headers({
        "x-forwarded-for": "203.0.113.2, 203.0.113.3",
        "x-real-ip": "203.0.113.4"
      })
    ),
    "203.0.113.2"
  );
  assert.equal(
    getClientIp(
      new Headers({
        "x-real-ip": "203.0.113.4"
      })
    ),
    "203.0.113.4"
  );
  assert.equal(getClientIp(new Headers()), "unknown");
});

test("rate limit blocks after the configured threshold and resets by window", () => {
  const first = checkRateLimit({
    identifier: "203.0.113.10",
    pathname: "/api/analyze",
    limit: 2,
    windowMs: 1000,
    now: 100
  });
  const second = checkRateLimit({
    identifier: "203.0.113.10",
    pathname: "/api/analyze",
    limit: 2,
    windowMs: 1000,
    now: 200
  });
  const third = checkRateLimit({
    identifier: "203.0.113.10",
    pathname: "/api/analyze",
    limit: 2,
    windowMs: 1000,
    now: 300
  });
  const afterReset = checkRateLimit({
    identifier: "203.0.113.10",
    pathname: "/api/analyze",
    limit: 2,
    windowMs: 1000,
    now: 1200
  });

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.equal(afterReset.allowed, true);
});

test("rate limit and concurrency config read positive integer env overrides", () => {
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "22";
  process.env.ANALYZE_RATE_LIMIT_WINDOW_MS = "90000";
  process.env.ANALYSIS_CONCURRENCY_LIMIT = "4";

  assert.deepEqual(getAnalyzeRateLimitConfig(), {
    limit: 22,
    windowMs: 90000
  });
  assert.equal(getAnalysisConcurrencyLimit(), 4);
});

test("analysis cache key normalizes url and includes language", () => {
  const left = createAnalysisCacheKey(
    " HTTPS://Example.COM/product?b=2&a=1#reviews ",
    "zh-CN"
  );
  const right = createAnalysisCacheKey(
    "https://example.com/product?a=1&b=2",
    "zh-CN"
  );
  const otherLanguage = createAnalysisCacheKey(
    "https://example.com/product?a=1&b=2",
    "en"
  );

  assert.match(left, /^analysis:v2:[a-f0-9]{32}$/);
  assert.equal(left, right);
  assert.notEqual(left, otherLanguage);
  assert.equal(
    normalizeAnalysisUrl(" HTTPS://Example.COM/product?b=2&a=1#reviews "),
    "https://example.com/product?a=1&b=2"
  );
});

test("analysis cache returns hits before ttl and evicts expired entries", () => {
  setCachedAnalysis("analysis:v1:test", sampleAnalysisResponse, 1000, 100);

  assert.deepEqual(
    getCachedAnalysis("analysis:v1:test", 900),
    sampleAnalysisResponse
  );
  assert.equal(getCachedAnalysis("analysis:v1:test", 1100), undefined);
  assert.equal(getCachedAnalysis("analysis:v1:test", 1200), undefined);
});

test("analysis cache ttl reads positive integer env override", () => {
  process.env.ANALYSIS_CACHE_TTL_SECONDS = "42";

  assert.equal(getAnalysisCacheTtlMs(), 42_000);
});

test("analysis concurrency guard rejects over limit and releases once", () => {
  const first = tryAcquireAnalysisSlot(1);
  const second = tryAcquireAnalysisSlot(1);

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);

  if (first.ok) {
    first.release();
    first.release();
  }

  const third = tryAcquireAnalysisSlot(1);

  assert.equal(third.ok, true);

  if (third.ok) {
    third.release();
  }
});
