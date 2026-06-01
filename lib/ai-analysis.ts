import OpenAI from "openai";

export const DEFAULT_ANALYSIS_MODEL = "deepseek-ai/DeepSeek-V4-Flash";
export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_AI_ANALYSIS_TIMEOUT_MS = 30_000;

export type FeedbackAnalysisResult = {
  insightPreview: {
    comprehensiveScore: number;
    coreSummary: string;
  };
  coreMetrics: {
    totalReviews: number;
    highValueSignals: number;
    signalCluster: string;
    positiveRatio: number;
    positiveFocus: string;
  };
  emotionDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  deepInsights: {
    highFreqPainPoints: string[];
    featureRequests: string[];
    painPointEvidenceReviewIndexes?: number[][];
    featureRequestEvidenceReviewIndexes?: number[][];
  };
  typicalVoices: {
    positive: string;
    neutral: string;
    negative: string;
  };
  typicalVoiceEvidenceReviewIndexes?: {
    positive: number[];
    neutral: number[];
    negative: number[];
  };
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

const ANALYSIS_SYSTEM_PROMPT = `你是一位资深的用户体验（UX）分析师与产品经理，拥有极强的数据清洗、情感分析和需求提炼能力。你能从大量零散的应用商店用户评价中，精准抽丝剥茧，提取关键洞察。

请分析用户提供的 App Store 原始评论文本，并**必须以严格的 JSON 格式输出**。你的 JSON 必须完全符合以下结构和字段说明，不要输出任何额外的 Markdown 标记（如 \`\`\`json 等）或解释性文本：

{
  "insightPreview": {
    "comprehensiveScore": 84, // 0-100的综合情绪体验得分（数字）
    "coreSummary": "一句话概括：移动端用户在什么场景下觉得方便，但在跨端/特定场景衔接上遇到了什么核心阻力"
  },
  "coreMetrics": {
    "totalReviews": 438, // 评价总数（数字）
    "highValueSignals": 164, // 高价值信号数量（去除了纯发泄或无意义字眼，真正提及使用场景、痛点的评论数）（数字）
    "signalCluster": "例如：移动体验和协作阻力", // 聚类说明
    "positiveRatio": 61, // 正向占比百分比（仅数字）
    "positiveFocus": "例如：围绕任务查看与通知体验" // 正面评价核心聚焦说明
  },
  "emotionDistribution": {
    "positive": 61, // 正向情绪百分比（仅数字，与中立、负向总和需为100）
    "neutral": 27,
    "negative": 12
  },
  "deepInsights": {
    "highFreqPainPoints": [
      "痛点1（20字以内，直击要害，例如：从桌面切换到 iPad 后需要重新确认上下文）",
      "痛点2",
      "痛点3"
    ],
    "featureRequests": [
      "功能转化1（20字以内，将痛点转化为建设性改进请求，例如：跨设备同步当前任务状态）",
      "功能转化2",
      "功能转化3"
    ],
    "painPointEvidenceReviewIndexes": [
      [3, 12, 18],
      [7, 21],
      [4]
    ],
    "featureRequestEvidenceReviewIndexes": [
      [5, 9],
      [2, 14],
      [6]
    ]
  },
  "typicalVoices": {
    "positive": "提取的1条最具代表性的正向用户原话",
    "neutral": "提取的1条最具代表性的中立用户原话",
    "negative": "提取的1条最具代表性的负向用户原话"
  },
  "typicalVoiceEvidenceReviewIndexes": {
    "positive": [1, 8],
    "neutral": [10],
    "negative": [3, 12]
  }
}

证据编号规则：
- 用户输入中的每条评论都以 #1、#2、#3 这样的编号开头。
- 所有 evidenceReviewIndexes 字段必须只填写这些真实输入评论编号，不要编造不存在的编号。
- 每个数组最多返回 3 个编号，优先选择最能直接支撑对应痛点、功能请求或典型声音的原始评论。
- 如果没有足够证据，可以少于 3 个，但不要返回空数组，除非输入评论确实无法支撑该项。`;

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

function createAnalysisError(code = "AI_ANALYSIS_FAILED") {
  return new Error(code);
}

function createTimeoutError() {
  const error = createAnalysisError("AI_ANALYSIS_TIMEOUT");
  error.name = "TimeoutError";
  return error;
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
    const client = clientFactory({
      baseURL: SILICONFLOW_BASE_URL,
      apiKey,
      timeout: timeoutMs
    });

    const completion = await withTimeout(
      client.chat.completions.create({
        model: modelType,
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
    return JSON.parse(content) as FeedbackAnalysisResult;
  } catch (error) {
    console.error("[AI_ANALYSIS_FAILED]", {
      stage: "parse",
      modelType,
      error
    });
    throw createAnalysisError();
  }
}
