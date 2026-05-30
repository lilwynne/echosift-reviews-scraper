import { NextResponse } from "next/server";
import {
  getCachedAnalysis,
  setCachedAnalysis
} from "@/lib/analysis-cache";
import { runAnalyzePipeline } from "@/lib/analyze-pipeline";
import {
  checkRateLimit,
  createAnalysisCacheKey,
  getClientIp,
  getRequestPathname,
  tryAcquireAnalysisSlot
} from "@/lib/api-guards";
import { languages, type Language } from "@/lib/mock-data";

type AnalyzeRequestBody = {
  url?: unknown;
  language?: unknown;
};

const validLanguages = new Set<Language>(
  languages.map((language) => language.code)
);
const DEFAULT_ANALYSIS_MAX_REVIEWS = 50;
const DEFAULT_ANALYSIS_REVIEW_TEXT_MAX_CHARS = 1200;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getAnalysisMaxReviews() {
  return getPositiveIntegerEnv(
    "ANALYSIS_MAX_REVIEWS",
    DEFAULT_ANALYSIS_MAX_REVIEWS
  );
}

function getAnalysisReviewTextMaxChars() {
  return getPositiveIntegerEnv(
    "ANALYSIS_REVIEW_TEXT_MAX_CHARS",
    DEFAULT_ANALYSIS_REVIEW_TEXT_MAX_CHARS
  );
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message
      }
    },
    { status }
  );
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "请求体必须是有效的 JSON。", 400);
  }

  if (!isValidUrl(body.url)) {
    return jsonError("INVALID_URL", "请输入有效的产品链接。", 400);
  }

  if (
    typeof body.language !== "string" ||
    !validLanguages.has(body.language as Language)
  ) {
    return jsonError("INVALID_LANGUAGE", "请选择有效的返回语言。", 400);
  }

  const language = body.language as Language;
  const analysisMaxReviews = getAnalysisMaxReviews();
  const analysisReviewTextMaxChars = getAnalysisReviewTextMaxChars();
  const cacheKey = createAnalysisCacheKey(body.url, language, {
    maxReviews: analysisMaxReviews,
    reviewTextMaxChars: analysisReviewTextMaxChars
  });
  const rateLimit = checkRateLimit({
    identifier: getClientIp(request.headers),
    pathname: getRequestPathname(request)
  });

  if (!rateLimit.allowed) {
    return jsonError("RATE_LIMITED", "请求过于频繁，请稍后再试。", 429);
  }

  const cachedAnalysis = getCachedAnalysis(cacheKey);

  if (cachedAnalysis) {
    return NextResponse.json(cachedAnalysis);
  }

  const analysisSlot = tryAcquireAnalysisSlot();

  if (!analysisSlot.ok) {
    return jsonError(
      "ANALYSIS_CONCURRENCY_LIMITED",
      "当前分析请求较多，请稍后重试。",
      429
    );
  }

  try {
    const result = await runAnalyzePipeline({
      url: body.url,
      language,
      maxReviews: analysisMaxReviews,
      reviewTextMaxChars: analysisReviewTextMaxChars
    });

    if (!result.ok) {
      console.info("[ANALYZE_TIMING]", {
        ...result.meta,
        ...result.timings
      });

      return jsonError(result.error.code, result.error.message, result.status);
    }

    console.info("[ANALYZE_TIMING]", {
      ...result.meta,
      ...result.timings,
      stage: result.response.reviewCount === 0 ? "empty_reviews" : "completed"
    });

    if (result.response.reviewCount > 0) {
      setCachedAnalysis(cacheKey, result.response);
    }

    return NextResponse.json(result.response);
  } finally {
    analysisSlot.release();
  }
}
