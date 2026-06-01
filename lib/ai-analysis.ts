import OpenAI from "openai";

export const DEFAULT_ANALYSIS_MODEL = "deepseek-ai/DeepSeek-V4-Flash";
export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_AI_ANALYSIS_TIMEOUT_MS = 45_000;
const DEFAULT_AI_ANALYSIS_MAX_TOKENS = 700;

export type FeedbackAnalysisDraft = {
  coreSummary: string;
  signalCluster: string;
  positiveFocus: string;
  highFreqPainPoints: string[];
  featureRequests: string[];
};

type SiliconFlowClientOptions = {
  baseURL: string;
  apiKey: string;
  timeout?: number;
};

type AnalyzeFeedbackRequest = {
  model: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
  response_format: {
    type: "json_object";
  };
};

type AnalyzeFeedbackResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

type AnalyzeFeedbackClient = {
  chat: {
    completions: {
      create: (
        request: AnalyzeFeedbackRequest
      ) => Promise<AnalyzeFeedbackResponse>;
    };
  };
};

type AnalyzeFeedbackClientFactory = (
  options: SiliconFlowClientOptions
) => AnalyzeFeedbackClient;

const ANALYSIS_SYSTEM_PROMPT = `你是资深 UX 分析师。根据输入的应用商店评论，提炼少量产品洞察。

只输出严格 JSON，不要 Markdown，不要解释。JSON 必须只有这些字段：
{
  "coreSummary": "一句话总结用户价值和主要阻力，40字以内",
  "signalCluster": "主要反馈聚类，12字以内",
  "positiveFocus": "正面评价焦点，18字以内",
  "highFreqPainPoints": ["痛点1，18字以内", "痛点2", "痛点3"],
  "featureRequests": ["改进建议1，18字以内", "改进建议2", "改进建议3"]
}

最多返回 3 个痛点和 3 个改进建议。不要输出评价总数、情绪比例、评分、证据编号或用户原话。`;

const defaultClientFactory: AnalyzeFeedbackClientFactory = (options) =>
  new OpenAI(options);

let clientFactory = defaultClientFactory;

export function __setAnalyzeFeedbackClientFactoryForTest(
  factory?: AnalyzeFeedbackClientFactory
) {
  clientFactory = factory ?? defaultClientFactory;
}

function getSiliconFlowApiKey() {
  // 在 .env.local 中配置：SILICONFLOW_API_KEY=你的硅基流动 API 密钥
  return process.env.SILICONFLOW_API_KEY?.trim();
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getAiAnalysisTimeoutMs() {
  return getPositiveIntegerEnv(
    "AI_ANALYSIS_TIMEOUT_MS",
    DEFAULT_AI_ANALYSIS_TIMEOUT_MS
  );
}

export function getAiAnalysisMaxTokens() {
  return getPositiveIntegerEnv(
    "AI_ANALYSIS_MAX_TOKENS",
    DEFAULT_AI_ANALYSIS_MAX_TOKENS
  );
}

function createAnalysisError(code = "AI_ANALYSIS_FAILED") {
  return new Error(code);
}

function createTimeoutError() {
  const error = createAnalysisError("AI_ANALYSIS_TIMEOUT");
  error.name = "TimeoutError";
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.replace(/\s+/g, " ").trim();

  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeTextArray(value: unknown, fallback: string[], maxLength: number) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => normalizeText(item, "", maxLength))
    .filter(Boolean)
    .slice(0, 3);

  return items.length > 0 ? items : fallback;
}

function normalizeAnalysisDraft(value: unknown): FeedbackAnalysisDraft {
  if (!isRecord(value)) {
    throw createAnalysisError();
  }

  return {
    coreSummary: normalizeText(
      value.coreSummary,
      "用户认可核心价值，但仍存在稳定性和关键流程阻力。",
      120
    ),
    signalCluster: normalizeText(value.signalCluster, "体验阻力", 40),
    positiveFocus: normalizeText(value.positiveFocus, "核心功能价值", 60),
    highFreqPainPoints: normalizeTextArray(
      value.highFreqPainPoints,
      ["稳定性和流程阻力"],
      60
    ),
    featureRequests: normalizeTextArray(
      value.featureRequests,
      ["提升稳定性和关键流程体验"],
      60
    )
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(createTimeoutError());
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function analyzeFeedback(
  reviewsText: string,
  modelType = DEFAULT_ANALYSIS_MODEL
) {
  const apiKey = getSiliconFlowApiKey();

  if (!apiKey) {
    console.error("[AI_ANALYSIS_FAILED]", {
      stage: "config",
      error: new Error("MISSING_SILICONFLOW_API_KEY")
    });
    throw createAnalysisError();
  }

  let content: string | null | undefined;

  try {
    const timeoutMs = getAiAnalysisTimeoutMs();
    const maxTokens = getAiAnalysisMaxTokens();
    const client = clientFactory({
      baseURL: SILICONFLOW_BASE_URL,
      apiKey,
      timeout: timeoutMs
    });

    const completion = await withTimeout(
      client.chat.completions.create({
        model: modelType,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          {
            role: "system",
            content: ANALYSIS_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: reviewsText
          }
        ],
        response_format: {
          type: "json_object"
        }
      }),
      timeoutMs
    );

    content = completion.choices?.[0]?.message?.content;
  } catch (error) {
    console.error("[AI_ANALYSIS_FAILED]", {
      stage: "request",
      modelType,
      error
    });
    throw error instanceof Error && error.message === "AI_ANALYSIS_TIMEOUT"
      ? error
      : createAnalysisError();
  }

  if (!content?.trim()) {
    console.error("[AI_ANALYSIS_FAILED]", {
      stage: "empty_response",
      modelType,
      content
    });
    throw createAnalysisError();
  }

  try {
    return normalizeAnalysisDraft(JSON.parse(content));
  } catch (error) {
    console.error("[AI_ANALYSIS_FAILED]", {
      stage: "parse",
      modelType,
      error
    });
    throw createAnalysisError();
  }
}
