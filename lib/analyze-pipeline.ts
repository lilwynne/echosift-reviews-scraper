import { analyzeFeedback } from "./ai-analysis.ts";
import { statusFromScrapeErrorCode } from "./api-errors.ts";
import type {
  AnalysisResult,
  AnalyzeApiResponse,
  EvidenceMap,
  ReviewEvidence,
  ReviewSentiment
} from "./analysis-types.ts";
import { createEmptyAnalysisResult } from "./empty-analysis.ts";
import { fetchReviews, type NormalizedReview } from "./reviews.ts";
import type { Language } from "./mock-data.ts";

export type AnalyzePipelineStage = "scraping" | "analyzing";

export type AnalyzePipelineOptions = {
  url: string;
  language: Language;
  maxReviews: number;
  reviewTextMaxChars: number;
  selectedReviewLimit?: number;
  modelType?: string;
  onStage?: (stage: AnalyzePipelineStage) => void;
};

export type AnalyzePipelineSuccess = {
  ok: true;
  response: AnalyzeApiResponse;
  timings: {
    scrapeMs: number;
    analysisMs?: number;
    totalMs: number;
  };
  meta: {
    source: string;
    provider?: string;
    reviewCount: number;
    aiReviewCount: number;
    maxReviews: number;
    selectedReviewLimit?: number;
    reviewTextMaxChars: number;
  };
};

export type AnalyzePipelineFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  status: number;
  timings: {
    scrapeMs?: number;
    totalMs: number;
  };
  meta: {
    source?: string;
    provider?: string;
    reviewCount?: number;
    aiReviewCount?: number;
    maxReviews: number;
    selectedReviewLimit?: number;
    reviewTextMaxChars: number;
    stage: "scrape_failed" | "analysis_failed";
  };
};

export type AnalyzePipelineResult =
  | AnalyzePipelineSuccess
  | AnalyzePipelineFailure;

const EVIDENCE_REVIEWS_PER_CARD = 3;
const HIGH_VALUE_KEYWORD_RE =
  /bug|crash|slow|lag|error|fail|failed|issue|problem|request|feature|wish|hope|need|missing|improve|broken|confusing|expensive|login|sync|notification|workflow|export|import|search|offline|卡|慢|崩溃|闪退|错误|报错|失败|问题|痛点|希望|建议|需要|不能|无法|缺少|优化|改进|同步|通知|工作流|导出|导入|搜索|离线|登录|价格|付费/i;

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

function formatReviewForAnalysis(
  review: ReviewEvidence,
  analysisIndex: number,
  maxTextChars: number
) {
  const lines = [`#${analysisIndex + 1}`];

  lines.push(`originalIndex: ${review.reviewIndex}`);

  if (typeof review.rating === "number") {
    lines.push(`rating: ${review.rating}`);
  }

  if (typeof review.votes === "number") {
    lines.push(`votes: ${review.votes}`);
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

function buildReviewsText(reviews: ReviewEvidence[], maxTextChars: number) {
  if (reviews.length === 0) {
    return "未抓取到有效评论。";
  }

  return reviews
    .map((review, index) => formatReviewForAnalysis(review, index, maxTextChars))
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
  fallbackOffset: number,
  analysisIndexToFullIndex?: Map<number, number>
) {
  const ids = normalizeEvidenceIndexes(rawIndexes, reviews.length)
    .map((index) => analysisIndexToFullIndex?.get(index) ?? index)
    .map((index) => reviews[index - 1]?.snippetId)
    .filter((id): id is string => Boolean(id));

  if (ids.length > 0) {
    return ids;
  }

  return getFallbackEvidenceIds(reviews, fallbackSentiment, fallbackOffset);
}

function buildEvidenceMap(
  analysis: AnalysisResult,
  reviews: ReviewEvidence[],
  analysisIndexToFullIndex?: Map<number, number>
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
        index,
        analysisIndexToFullIndex
      )
    ),
    featureRequests: analysis.deepInsights.featureRequests.map((_, index) =>
      resolveEvidenceIds(
        featureRequestEvidence[index],
        reviews,
        "positive",
        index,
        analysisIndexToFullIndex
      )
    ),
    typicalVoices: {
      positive: resolveEvidenceIds(
        typicalVoiceEvidence.positive,
        reviews,
        "positive",
        0,
        analysisIndexToFullIndex
      ),
      neutral: resolveEvidenceIds(
        typicalVoiceEvidence.neutral,
        reviews,
        "neutral",
        0,
        analysisIndexToFullIndex
      ),
      negative: resolveEvidenceIds(
        typicalVoiceEvidence.negative,
        reviews,
        "negative",
        0,
        analysisIndexToFullIndex
      )
    }
  };
}

function getReviewTimestampScore(review: ReviewEvidence) {
  if (!review.date) {
    return 0;
  }

  const timestamp = Date.parse(review.date);

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.min(25, Math.max(0, timestamp / 86_400_000 / 365));
}

function scoreReviewForAnalysis(review: ReviewEvidence) {
  const textLength = review.text.trim().length;
  const rating = typeof review.rating === "number" ? review.rating : undefined;
  const votes = typeof review.votes === "number" ? review.votes : 0;
  let score = Math.min(35, textLength / 18);

  if (rating !== undefined) {
    score += 12;

    if (rating <= 2) {
      score += 18;
    } else if (rating === 3) {
      score += 8;
    } else if (rating >= 4) {
      score += 6;
    }
  }

  if (HIGH_VALUE_KEYWORD_RE.test(`${review.title ?? ""} ${review.text}`)) {
    score += 28;
  }

  score += Math.min(12, Math.log2(Math.max(0, votes) + 1) * 3);
  score += getReviewTimestampScore(review);

  return score;
}

function selectReviewsForAnalysis(
  reviews: ReviewEvidence[],
  selectedReviewLimit?: number
) {
  if (
    typeof selectedReviewLimit !== "number" ||
    !Number.isFinite(selectedReviewLimit) ||
    selectedReviewLimit <= 0 ||
    reviews.length <= selectedReviewLimit
  ) {
    return reviews;
  }

  const selectedIndexes = new Set<number>();
  const sorted = reviews
    .map((review, index) => ({
      index,
      score: scoreReviewForAnalysis(review)
    }))
    .sort((left, right) => right.score - left.score);

  for (const item of sorted) {
    selectedIndexes.add(item.index);

    if (selectedIndexes.size >= selectedReviewLimit) {
      break;
    }
  }

  return reviews.filter((_, index) => selectedIndexes.has(index));
}

function buildAnalysisIndexToFullIndex(selectedReviews: ReviewEvidence[]) {
  const map = new Map<number, number>();

  selectedReviews.forEach((review, index) => {
    map.set(index + 1, review.reviewIndex);
  });

  return map;
}

export async function runAnalyzePipeline({
  url,
  language,
  maxReviews,
  reviewTextMaxChars,
  selectedReviewLimit,
  modelType,
  onStage
}: AnalyzePipelineOptions): Promise<AnalyzePipelineResult> {
  const requestStart = performance.now();
  const scrapeStart = performance.now();

  onStage?.("scraping");

  const scrapeResult = await fetchReviews(url, {
    maxReviews
  });
  const scrapeMs = elapsedMs(scrapeStart);

  if (!scrapeResult.ok) {
    return {
      ok: false,
      error: scrapeResult.error,
      status: statusFromScrapeErrorCode(scrapeResult.error.code),
      timings: {
        scrapeMs,
        totalMs: elapsedMs(requestStart)
      },
      meta: {
        maxReviews,
        selectedReviewLimit,
        reviewTextMaxChars,
        stage: "scrape_failed"
      }
    };
  }

  const reviews = buildReviewEvidence(scrapeResult.reviews);

  if (scrapeResult.count === 0) {
    const analysis = createEmptyAnalysisResult();
    const response: AnalyzeApiResponse = {
      sourceUrl: url,
      language,
      scrapeSource: scrapeResult.source,
      scrapeProvider: scrapeResult.provider,
      reviewCount: scrapeResult.count,
      reviews,
      evidence: buildEvidenceMap(analysis, reviews),
      analysis
    };

    return {
      ok: true,
      response,
      timings: {
        scrapeMs,
        totalMs: elapsedMs(requestStart)
      },
      meta: {
        source: scrapeResult.source,
        provider: scrapeResult.provider,
        reviewCount: scrapeResult.count,
        aiReviewCount: 0,
        maxReviews,
        selectedReviewLimit,
        reviewTextMaxChars
      }
    };
  }

  onStage?.("analyzing");

  const selectedReviews = selectReviewsForAnalysis(reviews, selectedReviewLimit);
  const analysisIndexToFullIndex = buildAnalysisIndexToFullIndex(selectedReviews);
  const analysisStart = performance.now();

  try {
    const analysis = await analyzeFeedback(
      buildReviewsText(selectedReviews, reviewTextMaxChars),
      modelType
    );
    const response: AnalyzeApiResponse = {
      sourceUrl: url,
      language,
      scrapeSource: scrapeResult.source,
      scrapeProvider: scrapeResult.provider,
      reviewCount: scrapeResult.count,
      reviews,
      evidence: buildEvidenceMap(analysis, reviews, analysisIndexToFullIndex),
      analysis
    };

    return {
      ok: true,
      response,
      timings: {
        scrapeMs,
        analysisMs: elapsedMs(analysisStart),
        totalMs: elapsedMs(requestStart)
      },
      meta: {
        source: scrapeResult.source,
        provider: scrapeResult.provider,
        reviewCount: scrapeResult.count,
        aiReviewCount: selectedReviews.length,
        maxReviews,
        selectedReviewLimit,
        reviewTextMaxChars
      }
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "AI_ANALYSIS_FAILED",
        message: "AI 分析服务暂时不可用，请稍后重试。"
      },
      status: 502,
      timings: {
        scrapeMs,
        totalMs: elapsedMs(requestStart)
      },
      meta: {
        source: scrapeResult.source,
        provider: scrapeResult.provider,
        reviewCount: scrapeResult.count,
        aiReviewCount: selectedReviews.length,
        maxReviews,
        selectedReviewLimit,
        reviewTextMaxChars,
        stage: "analysis_failed"
      }
    };
  }
}

export function __selectReviewsForAnalysisForTest(
  reviews: ReviewEvidence[],
  selectedReviewLimit?: number
) {
  return selectReviewsForAnalysis(reviews, selectedReviewLimit);
}
