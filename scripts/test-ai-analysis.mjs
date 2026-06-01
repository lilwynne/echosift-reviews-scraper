import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalApiKey = process.env.SILICONFLOW_API_KEY;
const originalAiAnalysisTimeout = process.env.AI_ANALYSIS_TIMEOUT_MS;
const originalAiAnalysisMaxTokens = process.env.AI_ANALYSIS_MAX_TOKENS;
const originalConsoleError = console.error;

const {
  DEFAULT_ANALYSIS_MODEL,
  SILICONFLOW_BASE_URL,
  __setAnalyzeFeedbackClientFactoryForTest,
  analyzeFeedback
} = await import("../lib/ai-analysis.ts");

const sampleDraft = {
  coreSummary: "移动端查看任务方便，但跨端衔接存在阻力",
  signalCluster: "移动体验阻力",
  positiveFocus: "任务查看与通知",
  highFreqPainPoints: ["跨端上下文断裂", "移动端 diff 不完整", "通知不及时"],
  featureRequests: ["同步任务状态", "展示完整 diff", "增强通知稳定性"]
};

afterEach(() => {
  __setAnalyzeFeedbackClientFactoryForTest();
  console.error = originalConsoleError;

  if (originalApiKey === undefined) {
    delete process.env.SILICONFLOW_API_KEY;
  } else {
    process.env.SILICONFLOW_API_KEY = originalApiKey;
  }

  if (originalAiAnalysisTimeout === undefined) {
    delete process.env.AI_ANALYSIS_TIMEOUT_MS;
  } else {
    process.env.AI_ANALYSIS_TIMEOUT_MS = originalAiAnalysisTimeout;
  }

  if (originalAiAnalysisMaxTokens === undefined) {
    delete process.env.AI_ANALYSIS_MAX_TOKENS;
  } else {
    process.env.AI_ANALYSIS_MAX_TOKENS = originalAiAnalysisMaxTokens;
  }
});

test("analyzeFeedback calls SiliconFlow with default model and parses JSON", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";

  let capturedOptions;
  let capturedRequest;

  __setAnalyzeFeedbackClientFactoryForTest((options) => {
    capturedOptions = options;

    return {
      chat: {
        completions: {
          create: async (request) => {
            capturedRequest = request;

            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify(sampleDraft)
                  }
                }
              ]
            };
          }
        }
      }
    };
  });

  const result = await analyzeFeedback("用户评论原文");

  assert.equal(result.coreSummary, sampleDraft.coreSummary);
  assert.deepEqual(result.highFreqPainPoints, sampleDraft.highFreqPainPoints);
  assert.deepEqual(capturedOptions, {
    baseURL: SILICONFLOW_BASE_URL,
    apiKey: "siliconflow-test-key",
    timeout: 45000
  });
  assert.equal(capturedRequest.model, DEFAULT_ANALYSIS_MODEL);
  assert.equal(capturedRequest.temperature, 0.2);
  assert.equal(capturedRequest.max_tokens, 700);
  assert.deepEqual(capturedRequest.response_format, {
    type: "json_object"
  });
  assert.equal(capturedRequest.messages[0].role, "system");
  assert.match(capturedRequest.messages[0].content, /资深 UX/);
  assert.doesNotMatch(capturedRequest.messages[0].content, /evidenceReviewIndexes/);
  assert.doesNotMatch(capturedRequest.messages[0].content, /totalReviews/);
  assert.equal(capturedRequest.messages[1].role, "user");
  assert.equal(capturedRequest.messages[1].content, "用户评论原文");
});

test("analyzeFeedback uses the provided model type", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";

  let capturedModel;

  __setAnalyzeFeedbackClientFactoryForTest(() => ({
    chat: {
      completions: {
        create: async (request) => {
          capturedModel = request.model;

          return {
            choices: [
              {
                message: {
                    content: JSON.stringify(sampleDraft)
                  }
                }
              ]
          };
        }
      }
    }
  }));

  await analyzeFeedback("用户评论原文", "Qwen/Qwen3-32B");

  assert.equal(capturedModel, "Qwen/Qwen3-32B");
});

test("analyzeFeedback logs and throws a normalized error when the API fails", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";

  const logs = [];
  console.error = (...args) => {
    logs.push(args);
  };

  __setAnalyzeFeedbackClientFactoryForTest(() => ({
    chat: {
      completions: {
        create: async () => {
          throw new Error("upstream failed");
        }
      }
    }
  }));

  await assert.rejects(
    analyzeFeedback("用户评论原文"),
    /AI_ANALYSIS_FAILED/
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[AI_ANALYSIS_FAILED]");
  assert.equal(logs[0][1].stage, "request");
  assert.equal(logs[0][1].error.message, "upstream failed");
});

test("analyzeFeedback logs and throws a normalized error when JSON parsing fails", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";

  const logs = [];
  console.error = (...args) => {
    logs.push(args);
  };

  __setAnalyzeFeedbackClientFactoryForTest(() => ({
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: "{invalid json"
              }
            }
          ]
        })
      }
    }
  }));

  await assert.rejects(
    analyzeFeedback("用户评论原文"),
    /AI_ANALYSIS_FAILED/
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[AI_ANALYSIS_FAILED]");
  assert.equal(logs[0][1].stage, "parse");
  assert.equal(Object.hasOwn(logs[0][1], "rawContent"), false);
});

test("analyzeFeedback logs and throws a normalized error when the API key is missing", async () => {
  delete process.env.SILICONFLOW_API_KEY;

  let clientCreated = false;
  const logs = [];
  console.error = (...args) => {
    logs.push(args);
  };

  __setAnalyzeFeedbackClientFactoryForTest(() => {
    clientCreated = true;
    throw new Error("client should not be created");
  });

  await assert.rejects(
    analyzeFeedback("用户评论原文"),
    /AI_ANALYSIS_FAILED/
  );
  assert.equal(clientCreated, false);
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[AI_ANALYSIS_FAILED]");
  assert.equal(logs[0][1].stage, "config");
  assert.equal(logs[0][1].error.message, "MISSING_SILICONFLOW_API_KEY");
});

test("analyzeFeedback times out slow model requests", async () => {
  process.env.SILICONFLOW_API_KEY = "siliconflow-test-key";
  process.env.AI_ANALYSIS_TIMEOUT_MS = "10";

  const logs = [];
  console.error = (...args) => {
    logs.push(args);
  };

  __setAnalyzeFeedbackClientFactoryForTest(() => ({
    chat: {
      completions: {
        create: async () => new Promise(() => undefined)
      }
    }
  }));

  await assert.rejects(
    analyzeFeedback("用户评论原文"),
    /AI_ANALYSIS_TIMEOUT/
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[AI_ANALYSIS_FAILED]");
  assert.equal(logs[0][1].stage, "request");
});
