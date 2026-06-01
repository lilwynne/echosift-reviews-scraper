import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { createEmptyAnalysisResult } from "../lib/empty-analysis.ts";

const originalApiKey = process.env.SILICONFLOW_API_KEY;
const originalRateLimit = process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS;
const originalAnalysisJobTimeout = process.env.ANALYSIS_JOB_TIMEOUT_MS;
const originalReviewRequestTimeout = process.env.REVIEWS_REQUEST_TIMEOUT_MS;
const originalFetch = globalThis.fetch;
const originalConsoleInfo = console.info;

const { __clearAnalysisCacheForTest } = await import(
  "../lib/analysis-cache.ts"
);
const { __resetApiGuardsForTest } = await import("../lib/api-guards.ts");
const { __setAnalyzeFeedbackClientFactoryForTest } = await import(
  "../lib/ai-analysis.ts"
);
const { __clearAnalyzeJobsForTest } = await import("../lib/analyze-jobs.ts");
const { __selectReviewsForAnalysisForTest } = await import(
  "../lib/analyze-pipeline.ts"
);
const { POST } = await import("../app/api/analyze/route.ts");
const { POST: POST_JOB } = await import("../app/api/analyze/jobs/route.ts");
const { GET: GET_JOB } = await import(
  "../app/api/analyze/jobs/[jobId]/route.ts"
);

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

  if (originalAnalysisJobTimeout === undefined) {
    delete process.env.ANALYSIS_JOB_TIMEOUT_MS;
  } else {
    process.env.ANALYSIS_JOB_TIMEOUT_MS = originalAnalysisJobTimeout;
  }

  if (originalReviewRequestTimeout === undefined) {
    delete process.env.REVIEWS_REQUEST_TIMEOUT_MS;
  } else {
    process.env.REVIEWS_REQUEST_TIMEOUT_MS = originalReviewRequestTimeout;
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

function createAnalyzeJobRequest(url) {
  return new Request("http://127.0.0.1:3000/api/analyze/jobs", {
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

async function getAnalyzeJob(jobId) {
  const response = await GET_JOB(
    new Request(`http://127.0.0.1:3000/api/analyze/jobs/${jobId}`),
    {
      params: {
        jobId
      }
    }
  );

  return {
    response,
    payload: await response.json()
  };
}

async function waitForAnalyzeJob(jobId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await getAnalyzeJob(jobId);

    if (
      result.payload.status === "completed" ||
      result.payload.status === "failed"
    ) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  throw new Error("Timed out waiting for analyze job.");
}

afterEach(() => {
  __clearAnalysisCacheForTest();
  __clearAnalyzeJobsForTest();
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

test("review preselection keeps high-value reviews within the configured limit", () => {
  const reviews = Array.from({ length: 6 }, (_, index) => ({
    snippetId: `app-store:review-${index + 1}:${index + 1}`,
    reviewIndex: index + 1,
    id: `review-${index + 1}`,
    source: "app-store",
    text: index === 4 ? "很好" : `普通反馈 ${index + 1}`,
    rating: index === 2 ? 1 : 5,
    votes: index === 3 ? 40 : 0,
    date: `2026-05-0${index + 1}T00:00:00.000Z`
  }));

  reviews[5].text = "希望增加导出工作流，并优化同步失败的问题。";

  const selected = __selectReviewsForAnalysisForTest(reviews, 3);

  assert.equal(selected.length, 3);
  assert(selected.some((review) => review.reviewIndex === 3));
  assert(selected.some((review) => review.reviewIndex === 4));
  assert(selected.some((review) => review.reviewIndex === 6));
});

test("analyze jobs share state across separately loaded route modules", async () => {
  console.info = () => undefined;
  const importSuffix = Date.now();
  const firstModule = await import(
    `../lib/analyze-jobs.ts?store-a=${importSuffix}`
  );
  const secondModule = await import(
    `../lib/analyze-jobs.ts?store-b=${importSuffix}`
  );

  const created = firstModule.createAnalyzeJob({
    url: "https://example.com",
    language: "zh-CN",
    maxReviews: 1,
    selectedReviewLimit: 1,
    reviewTextMaxChars: 10
  });
  const found = secondModule.getAnalyzeJob(created.jobId);

  assert.equal(found?.jobId, created.jobId);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = secondModule.getAnalyzeJob(created.jobId);

    if (current?.status === "failed" || current?.status === "completed") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
});

test("analyze job completes with 50 fetched reviews, 24 AI reviews, and mapped evidence", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  console.info = () => undefined;

  const appUrl = "https://apps.apple.com/cn/app/example/id123456789";
  let capturedAnalysisText = "";
  const rssReviews = Array.from({ length: 50 }, (_, index) => {
    const reviewNumber = index + 1;
    return {
      id: {
        label: `rss-review-${reviewNumber}`
      },
      title: {
        label: `Review ${reviewNumber}`
      },
      content: {
        label:
          reviewNumber === 50
            ? "希望增加导出工作流，并优化同步失败的问题。"
            : `普通评论 ${reviewNumber}`
      },
      "im:rating": {
        label: reviewNumber === 50 ? "1" : "5"
      },
      updated: {
        label: `2026-05-${String((reviewNumber % 28) + 1).padStart(2, "0")}T00:00:00.000Z`
      }
    };
  });

  __setAnalyzeFeedbackClientFactoryForTest(() => ({
    chat: {
      completions: {
        create: async (request) => {
          capturedAnalysisText = request.messages[1].content;
          const selectedReviewMatch = capturedAnalysisText.match(
            /^#(\d+)\noriginalIndex: 50/m
          );
          const selectedReviewIndex = Number.parseInt(
            selectedReviewMatch?.[1] ?? "1",
            10
          );

          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    ...sampleAnalysis,
                    deepInsights: {
                    ...sampleAnalysis.deepInsights,
                    painPointEvidenceReviewIndexes: [[selectedReviewIndex]],
                    featureRequestEvidenceReviewIndexes: [[selectedReviewIndex]]
                  },
                  typicalVoiceEvidenceReviewIndexes: {
                      positive: [selectedReviewIndex],
                      neutral: [],
                      negative: [selectedReviewIndex]
                    }
                  })
                }
              }
            ]
          };
        }
      }
    }
  }));

  globalThis.fetch = async (input) => {
    const url = input instanceof URL ? input.toString() : String(input);

    assert(
      url.startsWith(
        "https://itunes.apple.com/cn/rss/customerreviews/page=1/id=123456789"
      )
    );

    return {
      ok: true,
      json: async () => ({
        feed: {
          entry: rssReviews
        }
      })
    };
  };

  const createResponse = await POST_JOB(createAnalyzeJobRequest(appUrl));
  const createPayload = await createResponse.json();

  assert.equal(createResponse.status, 202);
  assert.match(createPayload.jobId, /^[0-9a-f-]{36}$/);
  assert(
    ["queued", "scraping", "analyzing", "completed"].includes(
      createPayload.status
    )
  );

  const { response, payload } = await waitForAnalyzeJob(createPayload.jobId);

  assert.equal(response.status, 200);
  assert.equal(payload.status, "completed");
  assert.equal(payload.result.reviewCount, 50);
  assert.equal(payload.result.reviews.length, 50);
  assert.equal((capturedAnalysisText.match(/^#/gm) ?? []).length, 24);
  assert(capturedAnalysisText.includes("希望增加导出工作流"));
  assert.deepEqual(payload.result.evidence.painPoints[0], [
    "app-store:rss-review-50:50"
  ]);
});

test("analyze job returns cached completed result without refetching", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  console.info = () => undefined;

  const appUrl = "https://apps.apple.com/cn/app/example/id123456789";
  let fetchCalls = 0;

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
    fetchCalls += 1;

    if (url.includes("/page=2/")) {
      return {
        ok: true,
        json: async () => ({
          feed: {}
        })
      };
    }

    return {
      ok: true,
      json: async () => ({
        feed: {
          entry: [
            {
              id: {
                label: "rss-review-1"
              },
              title: {
                label: "Useful"
              },
              content: {
                label: "建议知识库加入固定问题的工作流功能。"
              },
              "im:rating": {
                label: "5"
              },
              updated: {
                label: "2026-05-01T00:00:00.000Z"
              }
            }
          ]
        }
      })
    };
  };

  const firstCreateResponse = await POST_JOB(createAnalyzeJobRequest(appUrl));
  const firstCreatePayload = await firstCreateResponse.json();
  const firstCompleted = await waitForAnalyzeJob(firstCreatePayload.jobId);

  assert.equal(firstCompleted.payload.status, "completed");
  const fetchCallsAfterFirstJob = fetchCalls;

  const secondCreateResponse = await POST_JOB(createAnalyzeJobRequest(appUrl));
  const secondCreatePayload = await secondCreateResponse.json();

  assert.equal(secondCreateResponse.status, 202);
  assert.equal(secondCreatePayload.status, "completed");
  assert.equal(secondCreatePayload.result.reviewCount, 1);
  assert.equal(fetchCalls, fetchCallsAfterFirstJob);
});

test("analyze job exposes failed scrape errors with a stable shape", async () => {
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  console.info = () => undefined;

  const createResponse = await POST_JOB(
    createAnalyzeJobRequest("https://www.producthunt.com/products/example")
  );
  const createPayload = await createResponse.json();
  const { payload } = await waitForAnalyzeJob(createPayload.jobId);

  assert.equal(payload.status, "failed");
  assert.deepEqual(payload.error, {
    code: "MISSING_PRODUCT_HUNT_API_TOKEN",
    message:
      "缺少 PRODUCT_HUNT_API_TOKEN，请先在 .env.local 中配置 Product Hunt Developer Token。",
    status: 503
  });
});

test("analyze job fails with a hard timeout instead of polling forever", async () => {
  process.env.ANALYZE_RATE_LIMIT_MAX_REQUESTS = "100";
  process.env.ANALYSIS_JOB_TIMEOUT_MS = "10";
  process.env.REVIEWS_REQUEST_TIMEOUT_MS = "10";
  console.info = () => undefined;

  globalThis.fetch = async () => new Promise(() => undefined);

  const createResponse = await POST_JOB(
    createAnalyzeJobRequest("https://apps.apple.com/cn/app/example/id123456789")
  );
  const createPayload = await createResponse.json();
  const { payload } = await waitForAnalyzeJob(createPayload.jobId);

  assert.equal(payload.status, "failed");
  assert.deepEqual(payload.error, {
    code: "ANALYZE_JOB_TIMEOUT",
    message: "分析任务耗时过长，请稍后重试或减少评论数量。",
    status: 504
  });
});
