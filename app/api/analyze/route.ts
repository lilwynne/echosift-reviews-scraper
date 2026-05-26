import { NextResponse } from "next/server";
import { analyzeFeedback } from "@/lib/ai-analysis";
import {
  getCachedAnalysis,
  setCachedAnalysis
} from "@/lib/analysis-cache";
import { statusFromScrapeErrorCode } from "@/lib/api-errors";
import {
  checkRateLimit,
  createAnalysisCacheKey,
  getClientIp,
  getRequestPathname,
  tryAcquireAnalysisSlot
} from "@/lib/api-guards";
import type {
  AnalysisResult,
  AnalyzeApiResponse,
  EvidenceMap,
  ReviewEvidence,
  ReviewSentiment
} from "@/lib/analysis-types";
import { Language, languages } from "@/lib/mock-data";
import { fetchReviews, type NormalizedReview } from "@/lib/reviews";

type AnalyzeRequestBody = {
  url?: unknown;
  language?: unknown;
};

const validLanguages = new Set<Language>(
  languages.map((language) => language.code)
);
const DEFAULT_ANALYSIS_MAX_REVIEWS = 100;
const DEFAULT_ANALYSIS_REVIEW_TEXT_MAX_CHARS = 1200;
const EVIDENCE_REVIEWS_PER_CARD = 3;

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

function elapsedMs(start: number) {
  return Math.round(performance.now() - start);
}

function trimTextForAnalysis(text: string, maxChars: number) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function getReviewSnippetId(review: NormalizedReview, index: number) {
  return `${review.source}:${review.id ?? "review"}:${index + 1}`;
}

function buildReviewEvidence(reviews: NormalizedReview[]): ReviewEvidence[] {
  return reviews.map((review, index) => ({
    ...review,
    snippetId: getReviewSnippetId(review, index),
    reviewIndex: index + 1
  }));
}

function jsonError(
  code: string,
  message: string,
  status: number
) {
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

function formatReviewForAnalysis(
  review: NormalizedReview,
  index: number,
  maxTextChars: number
) {
  const lines = [`#${index + 1}`];

  lines.push(`source: ${review.source}`);

  if (review.productName) {
    lines.push(`product: ${review.productName}`);
  }

  if (typeof review.rating === "number") {
    lines.push(`rating: ${review.rating}`);
  }

  if (review.title) {
    lines.push(`title: ${review.title}`);
  }

  if (review.date) {
    lines.push(`date: ${review.date}`);
  }

  lines.push(`text: ${trimTextForAnalysis(review.text, maxTextChars)}`);

  return lines.join("\n");
}

function buildReviewsText(reviews: NormalizedReview[], maxTextChars: number) {
  if (reviews.length === 0) {
    return "未抓取到有效评论。";
  }

  return reviews
    .map((review, index) =>
      formatReviewForAnalysis(review, index, maxTextChars)
    )
    .join("\n\n---\n\n");
}

function normalizeEvidenceIndexes(value: unknown, reviewCount: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  const indexes: number[] = [];

  for (const item of value) {
    const index =
      typeof item === "number" ? item : Number.parseInt(String(item), 10);

    if (
      Number.isInteger(index) &&
      index >= 1 &&
      index <= reviewCount &&
      !indexes.includes(index)
    ) {
      indexes.push(index);
    }

    if (indexes.length >= EVIDENCE_REVIEWS_PER_CARD) {
      break;
    }
  }

  return indexes;
}

function filterReviewsBySentiment(
  reviews: ReviewEvidence[],
  sentiment: ReviewSentiment
) {
  const ratedReviews = reviews.filter(
    (review) => typeof review.rating === "number"
  );

  if (sentiment === "positive") {
    return ratedReviews.filter((review) => Number(review.rating) >= 4);
  }

  if (sentiment === "negative") {
    return ratedReviews.filter((review) => Number(review.rating) <= 2);
  }

  return ratedReviews.filter((review) => Number(review.rating) === 3);
}

function getFallbackEvidenceIds(
  reviews: ReviewEvidence[],
  sentiment: ReviewSentiment,
  offset: number
) {
  const matchingReviews = filterReviewsBySentiment(reviews, sentiment);
  const candidates = matchingReviews.length > 0 ? matchingReviews : reviews;

  if (candidates.length === 0) {
    return [];
  }

  const ids: string[] = [];
  const count = Math.min(EVIDENCE_REVIEWS_PER_CARD, candidates.length);

  for (let index = 0; index < count; index += 1) {
    ids.push(candidates[(offset + index) % candidates.length].snippetId);
  }

  return ids;
}

function resolveEvidenceIds(
  rawIndexes: unknown,
  reviews: ReviewEvidence[],
  fallbackSentiment: ReviewSentiment,
  fallbackOffset: number
) {
  const ids = normalizeEvidenceIndexes(rawIndexes, reviews.length)
    .map((index) => reviews[index - 1]?.snippetId)
    .filter((id): id is string => Boolean(id));

  if (ids.length > 0) {
    return ids;
  }

  return getFallbackEvidenceIds(reviews, fallbackSentiment, fallbackOffset);
}

function buildEvidenceMap(
  analysis: AnalysisResult,
  reviews: ReviewEvidence[]
): EvidenceMap {
  const painPointEvidence =
    analysis.deepInsights.painPointEvidenceReviewIndexes ?? [];
  const featureRequestEvidence =
    analysis.deepInsights.featureRequestEvidenceReviewIndexes ?? [];
  const typicalVoiceEvidence =
    analysis.typicalVoiceEvidenceReviewIndexes ?? {};

  return {
    painPoints: analysis.deepInsights.highFreqPainPoints.map((_, index) =>
      resolveEvidenceIds(
        painPointEvidence[index],
        reviews,
        "negative",
        index
      )
    ),
    featureRequests: analysis.deepInsights.featureRequests.map((_, index) =>
      resolveEvidenceIds(
        featureRequestEvidence[index],
        reviews,
        "positive",
        index
      )
    ),
    typicalVoices: {
      positive: resolveEvidenceIds(
        typicalVoiceEvidence.positive,
        reviews,
        "positive",
        0
      ),
      neutral: resolveEvidenceIds(
        typicalVoiceEvidence.neutral,
        reviews,
        "neutral",
        0
      ),
      negative: resolveEvidenceIds(
        typicalVoiceEvidence.negative,
        reviews,
        "negative",
        0
      )
    }
  };
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
  const rateLimit = checkRateLimit({
    identifier: getClientIp(request.headers),
    pathname: getRequestPathname(request)
  });

  if (!rateLimit.allowed) {
    return jsonError("RATE_LIMITED", "请求过于频繁，请稍后再试。", 429);
  }

  const cacheKey = createAnalysisCacheKey(body.url, language);
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
    const requestStart = performance.now();
    const analysisMaxReviews = getAnalysisMaxReviews();
    const analysisReviewTextMaxChars = getAnalysisReviewTextMaxChars();
    const scrapeStart = performance.now();
    const scrapeResult = await fetchReviews(body.url, {
      maxReviews: analysisMaxReviews
    });
    const scrapeMs = elapsedMs(scrapeStart);

    if (!scrapeResult.ok) {
      console.info("[ANALYZE_TIMING]", {
        stage: "scrape_failed",
        scrapeMs,
        totalMs: elapsedMs(requestStart),
        maxReviews: analysisMaxReviews,
        reviewTextMaxChars: analysisReviewTextMaxChars
      });

      return jsonError(
        scrapeResult.error.code,
        scrapeResult.error.message,
        statusFromScrapeErrorCode(scrapeResult.error.code)
      );
    }

    const reviews = buildReviewEvidence(scrapeResult.reviews);
    let analysis: AnalysisResult;

    try {
      const analysisStart = performance.now();
      analysis = await analyzeFeedback(
        buildReviewsText(scrapeResult.reviews, analysisReviewTextMaxChars)
      );
      console.info("[ANALYZE_TIMING]", {
        source: scrapeResult.source,
        scrapeMs,
        analysisMs: elapsedMs(analysisStart),
        totalMs: elapsedMs(requestStart),
        reviewCount: scrapeResult.count,
        maxReviews: analysisMaxReviews,
        reviewTextMaxChars: analysisReviewTextMaxChars
      });
    } catch {
      console.info("[ANALYZE_TIMING]", {
        source: scrapeResult.source,
        stage: "analysis_failed",
        scrapeMs,
        totalMs: elapsedMs(requestStart),
        reviewCount: scrapeResult.count,
        maxReviews: analysisMaxReviews,
        reviewTextMaxChars: analysisReviewTextMaxChars
      });

      return jsonError(
        "AI_ANALYSIS_FAILED",
        "AI 分析服务暂时不可用，请稍后重试。",
        502
      );
    }

    const responseBody: AnalyzeApiResponse = {
      sourceUrl: body.url,
      language,
      scrapeSource: scrapeResult.source,
      reviewCount: scrapeResult.count,
      reviews,
      evidence: buildEvidenceMap(analysis, reviews),
      analysis
    };

    setCachedAnalysis(cacheKey, responseBody);

    return NextResponse.json(responseBody);
  } finally {
    analysisSlot.release();
  }
}
