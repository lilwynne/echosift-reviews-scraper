import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { createEmptyAnalysisResult } from "../lib/empty-analysis.ts";

const originalApiKey = process.env.SILICONFLOW_API_KEY;
const originalRateLimit = process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS;
const originalFetch = globalThis.fetch;
const originalConsoleInfo = console.info;

const { __clearAnalysisCacheForTest } = await import(
  "../lib/analysis-cache.ts"
);
const { __resetApiGuardsForTest } = await import("../lib/api-guards.ts");
const { __setAnalyzeFeedbackClientFactoryForTest } = await import(
  "../lib/ai-analysis.ts"
);
const { POST } = await import("../app/api/analyze/route.ts");

const sampleAnalysis = {
  insightPreview: {
    comprehensiveScore: 80,
    coreSummary: "用户认可核心能力，但希望文件打开和工作流更稳定"
  },
  coreMetrics: {
    totalReviews: 2,
    highValueSignals: 2,
    signalCluster: "知识库文件处理",
    positiveRatio: 100,
    positiveFocus: "知识库能力"
  },
  emotionDistribution: {
    positive: 100,
    neutral: 0,
    negative: 0
  },
  deepInsights: {
    highFreqPainPoints: ["文件打开报错"],
    featureRequests: ["增加工作流"],
    painPointEvidenceReviewIndexes: [[1]],
    featureRequestEvidenceReviewIndexes: [[2]]
  },
  typicalVoices: {
    positive: "建议知识库加入工作流功能。",
    neutral: "",
    negative: "个人文件库的打开需要优化。"
  },
  typicalVoiceEvidenceReviewIndexes: {
    positive: [2],
    neutral: [],
    negative: [1]
  }
};

function restoreEnv() {
  if (originalApiKey === undefined) {
    delete process.env.SILICONFLOW_API_KEY;
  } else {
    process.env.SILICONFLOW_API_KEY = originalApiKey;
  }

  if (originalRateLimit === undefined) {
    delete process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS;
  } else {
    process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = originalRateLimit;
  }
}

function createAnalyzeRequest(url) {
  return new Request("http://127.0.0.1:3000/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": "203.0.113.80"
    },
    body: JSON.stringify({
      url,
      language: "zh-CN"
    })
  });
}

afterEach(() => {
  __clearAnalysisCacheForTest();
  __resetApiGuardsForTest();
  __setAnalyzeFeedbackClientFactoryForTest();
  globalThis.fetch = originalFetch;
  console.info = originalConsoleInfo;
  restoreEnv();
});

test("analyze route returns empty analysis without an AI key when no reviews are fetched", async () => {
  delete process.env.SILICONFLOW_API_KEY;
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  console.info = () => undefined;

  const appUrl = "https://apps.apple.com/cn/app/example/id123456789";
  const requestedUrls = [];

  globalThis.fetch = async (input) => {
    const url = input instanceof URL ? input.toString() : String(input);
    requestedUrls.push(url);

    if (url.startsWith("https://itunes.apple.com/cn/rss/customerreviews")) {
      return {
        ok: true,
        json: async () => ({
          feed: {}
        })
      };
    }

    assert.equal(url, appUrl);

    return {
      ok: true,
      text: async () => "<!doctype html><html><body>No reviews.</body></html>"
    };
  };

  const response = await POST(createAnalyzeRequest(appUrl));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.sourceUrl, appUrl);
  assert.equal(payload.scrapeSource, "app-store");
  assert.equal(payload.reviewCount, 0);
  assert.deepEqual(payload.reviews, []);
  assert.deepEqual(payload.evidence, {
    painPoints: [],
    featureRequests: [],
    typicalVoices: {
      positive: [],
      neutral: [],
      negative: []
    }
  });
  assert.deepEqual(payload.analysis, createEmptyAnalysisResult());
  assert.deepEqual(requestedUrls, [
    "https://itunes.apple.com/cn/rss/customerreviews/page=1/id=123456789/sortby=mostrecent/json",
    appUrl
  ]);
});

test("analyze route does not cache empty App Store scrape results", async () => {
  delete process.env.SILICONFLOW_API_KEY;
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  console.info = () => undefined;

  const appUrl = "https://apps.apple.com/cn/app/example/id123456789";
  let fetchCalls = 0;

  globalThis.fetch = async (input) => {
    const url = input instanceof URL ? input.toString() : String(input);
    fetchCalls += 1;

    if (url.startsWith("https://itunes.apple.com/cn/rss/customerreviews")) {
      return {
        ok: true,
        json: async () => ({
          feed: {}
        })
      };
    }

    assert.equal(url, appUrl);

    return {
      ok: true,
      text: async () => "<!doctype html><html><body>No reviews.</body></html>"
    };
  };

  const firstResponse = await POST(createAnalyzeRequest(appUrl));
  const secondResponse = await POST(createAnalyzeRequest(appUrl));

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal((await firstResponse.json()).reviewCount, 0);
  assert.equal((await secondResponse.json()).reviewCount, 0);
  assert.equal(fetchCalls, 4);
});

test("analyze route returns App Store web fallback reviews and provider metadata", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  console.info = () => undefined;

  const appUrl = "https://apps.apple.com/cn/app/example/id123456789";
  const webReviews = [
    {
      $kind: "Review",
      id: "web-review-1",
      title: "文件打开错误",
      date: "2026-05-01T00:00:00.000Z",
      contents: "个人文件库打开时提示网络连接错误。",
      rating: 2,
      reviewerName: "Ada"
    },
    {
      $kind: "Review",
      id: "web-review-2",
      title: "希望增加工作流",
      date: "2026-05-02T00:00:00.000Z",
      contents: "建议知识库加入固定问题的工作流功能。",
      rating: 5,
      reviewerName: "Grace"
    }
  ];

  __setAnalyzeFeedbackClientFactoryForTest(() => ({
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(sampleAnalysis)
              }
            }
          ]
        })
      }
    }
  }));

  globalThis.fetch = async (input) => {
    const url = input instanceof URL ? input.toString() : String(input);

    if (url.startsWith("https://itunes.apple.com/cn/rss/customerreviews")) {
      return {
        ok: true,
        json: async () => ({
          feed: {}
        })
      };
    }

    assert.equal(url, appUrl);

    return {
      ok: true,
      text: async () =>
        `<!doctype html><html><body><script type="application/json" id="serialized-server-data">${JSON.stringify({
          data: [
            {
              data: {
                shelfMapping: {
                  allProductReviews: {
                    items: webReviews.map((review) => ({
                      $kind: "ProductReview",
                      review
                    }))
                  }
                }
              }
            }
          ]
        })}</script></body></html>`
    };
  };

  const response = await POST(createAnalyzeRequest(appUrl));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.scrapeSource, "app-store");
  assert.equal(payload.scrapeProvider, "apple-web-page");
  assert.equal(payload.reviewCount, 2);
  assert.equal(payload.reviews[0].id, "web-review-1");
  assert.equal(payload.reviews[0].snippetId, "app-store:web-review-1:1");
  assert.equal(payload.reviews[1].text, "建议知识库加入固定问题的工作流功能。");
  assert.deepEqual(payload.analysis, sampleAnalysis);
});
