import {
  analyzeFeedback,
  type FeedbackAnalysisDraft
} from "./ai-analysis.ts";
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
    aiStatus?: "completed" | "fallback";
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
const PRODUCT_HUNT_POSITIVE_PATTERNS = [
  {
    pattern:
      /\b(congrats|congratulations|kudos|well done|great launch|nice launch|good luck)\b/i,
    weight: 3
  },
  {
    pattern:
      /\b(love|loved|awesome|amazing|fantastic|excellent|brilliant|impressive|promising|excited|exciting|useful|helpful|valuable|solid|slick|beautiful|clean|intuitive|must-have|game changer)\b/i,
    weight: 2
  },
  {
    pattern:
      /\b(looks|sounds|seems)\s+(great|awesome|promising|useful|helpful|interesting|impressive)\b/i,
    weight: 2
  },
  {
    pattern: /\b(can'?t wait|looking forward|eager to try|happy to see)\b/i,
    weight: 2
  },
  {
    pattern: /恭喜|祝贺|很棒|喜欢|有用|好用|认可|兴奋|期待|赞|优秀|厉害|不错|有帮助/,
    weight: 2
  }
];
const PRODUCT_HUNT_NEGATIVE_PATTERNS = [
  {
    pattern:
      /\b(bug|bugs|buggy|crash|crashes|crashed|broken|unusable|not usable|doesn'?t work|not working|failed|fails|failure|error|errors|issues?|problems?|pain point|friction)\b/i,
    weight: 3
  },
  {
    pattern:
      /\b(missing|lacks?|lack of|wish it had|needs? to|need to improve|should support|no way to)\b/i,
    weight: 2
  },
  {
    pattern:
      /\bwithout\s+(support|a\s+way|any\s+way|export|import|integration|docs?|pricing|transparency)\b/i,
    weight: 2
  },
  {
    pattern:
      /\b(inaccurate|not accurate|wrong|misleading|unreliable|opaque|not transparent|black box|disappoint(?:ed|ing)?|skeptical|concerned|confusing|hard to use|too expensive|overpriced)\b/i,
    weight: 3
  },
  {
    pattern:
      /\b(data|sources?|attribution|results?)\b.{0,48}\b(opaque|unclear|not transparent|wrong|inaccurate|unreliable|questionable)\b/i,
    weight: 3
  },
  {
    pattern:
      /\b(opaque|unclear|not transparent|wrong|inaccurate|unreliable|questionable)\b.{0,48}\b(data|sources?|attribution|results?)\b/i,
    weight: 3
  },
  {
    pattern: /\b(how|why)\b.{0,40}\b(trust|verify|accurate|privacy|secure)\b/i,
    weight: 2
  },
  {
    pattern:
      /不可用|不能用|无法使用|不准确|错误归因|归因不准|数据不透明|来源不透明|缺少|缺失|失望|质疑|担心|困惑|太贵|问题|痛点|崩溃|闪退|失败/,
    weight: 3
  }
];
const PRODUCT_HUNT_MAKER_VOICE_RE =
  /\b(hey\s+(product\s+hunt|ph)|i'?m\s+(the\s+)?(founder|co-founder|maker|creator)|as\s+(the\s+)?(founder|co-founder|maker)|maker\s+of|we\s+(built|created|made|launched|started|are\s+launching|just\s+launched|have\s+been\s+working|spent)|we'?re\s+(launching|building)|our\s+(team|product|app)|my\s+team|happy\s+to\s+answer|ask\s+me\s+anything|thanks?.{0,60}\b(checking|trying|supporting|feedback|launch))\b/i;
const CONTRAST_RE = /\b(but|however|though|although|yet)\b|但是|但|不过|然而/;

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

function filterReviewsBySentiment(
  reviews: ReviewEvidence[],
  sentiment: ReviewSentiment
) {
  return reviews.filter((review) => getReviewSentiment(review) === sentiment);
}

function getProductHuntTextSentimentScore(review: ReviewEvidence) {
  const text = `${review.title ?? ""} ${review.text}`.replace(/\s+/g, " ").trim();
  let positive = 0;
  let negative = 0;

  for (const { pattern, weight } of PRODUCT_HUNT_POSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      positive += weight;
    }
  }

  for (const { pattern, weight } of PRODUCT_HUNT_NEGATIVE_PATTERNS) {
    if (pattern.test(text)) {
      negative += weight;
    }
  }

  return {
    positive,
    negative
  };
}

function getProductHuntTextSentiment(review: ReviewEvidence): ReviewSentiment {
  const score = getProductHuntTextSentimentScore(review);
  const text = `${review.title ?? ""} ${review.text}`;

  if (score.negative > 0 && CONTRAST_RE.test(text) && score.negative >= score.positive) {
    return "negative";
  }

  if (score.negative >= score.positive + 1) {
    return "negative";
  }

  if (score.positive >= score.negative + 1) {
    return "positive";
  }

  return "neutral";
}

function getReviewSentiment(review: ReviewEvidence): ReviewSentiment {
  if (typeof review.rating === "number" && Number(review.rating) >= 4) {
    return "positive";
  }

  if (typeof review.rating === "number" && Number(review.rating) <= 2) {
    return "negative";
  }

  if (typeof review.rating === "number") {
    return "neutral";
  }

  if (review.source === "product-hunt") {
    return getProductHuntTextSentiment(review);
  }

  return "neutral";
}

function getSentimentCounts(reviews: ReviewEvidence[]) {
  return reviews.reduce(
    (counts, review) => {
      counts[getReviewSentiment(review)] += 1;
      return counts;
    },
    {
      positive: 0,
      neutral: 0,
      negative: 0
    } satisfies Record<ReviewSentiment, number>
  );
}

function getPercentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function getEmotionDistribution(reviews: ReviewEvidence[]) {
  const counts = getSentimentCounts(reviews);
  const total = reviews.length;
  const positive = getPercentage(counts.positive, total);
  const negative = getPercentage(counts.negative, total);

  return {
    positive,
    neutral: Math.max(0, 100 - positive - negative),
    negative
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getComprehensiveScore(reviews: ReviewEvidence[]) {
  const ratedReviews = reviews.filter(
    (review) => typeof review.rating === "number"
  );

  if (ratedReviews.length > 0) {
    const averageRating =
      ratedReviews.reduce((sum, review) => sum + Number(review.rating), 0) /
      ratedReviews.length;

    return clampScore(((averageRating - 1) / 4) * 100);
  }

  const distribution = getEmotionDistribution(reviews);

  return clampScore(
    distribution.positive + distribution.neutral * 0.55 - distribution.negative * 0.25
  );
}

function isHighValueReview(review: ReviewEvidence) {
  const text = `${review.title ?? ""} ${review.text}`.trim();

  return (
    text.length >= 80 ||
    HIGH_VALUE_KEYWORD_RE.test(text) ||
    (typeof review.rating === "number" && Number(review.rating) <= 2)
  );
}

function getHighValueSignalCount(reviews: ReviewEvidence[]) {
  return reviews.filter(isHighValueReview).length;
}

function normalizeInsightList(items: string[], fallback: string[]) {
  const normalized = items
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);

  return normalized.length > 0 ? normalized : fallback;
}

function getFallbackDraft(
  reviews: ReviewEvidence[],
  language: Language
): FeedbackAnalysisDraft {
  const distribution = getEmotionDistribution(reviews);
  const hasNegativeSkew = distribution.negative >= distribution.positive;

  if (language === "en") {
    return {
      coreSummary: hasNegativeSkew
        ? "Users still face stability and workflow friction around the core experience."
        : "Users value the core experience, while stability and workflow gaps remain.",
      signalCluster: hasNegativeSkew ? "Stability friction" : "Core value and gaps",
      positiveFocus: "Core product value",
      highFreqPainPoints: ["Stability and workflow friction"],
      featureRequests: ["Improve stability and key flows"]
    };
  }

  if (language === "zh-TW") {
    return {
      coreSummary: hasNegativeSkew
        ? "用戶仍在核心體驗中遇到穩定性與流程阻力。"
        : "用戶認可核心價值，但穩定性與關鍵流程仍需改善。",
      signalCluster: hasNegativeSkew ? "穩定性阻力" : "核心價值與缺口",
      positiveFocus: "核心功能價值",
      highFreqPainPoints: ["穩定性與流程阻力"],
      featureRequests: ["提升穩定性和關鍵流程"]
    };
  }

  return {
    coreSummary: hasNegativeSkew
      ? "用户仍在核心体验中遇到稳定性与流程阻力。"
      : "用户认可核心价值，但稳定性与关键流程仍需改善。",
    signalCluster: hasNegativeSkew ? "稳定性阻力" : "核心价值与缺口",
    positiveFocus: "核心功能价值",
    highFreqPainPoints: ["稳定性与流程阻力"],
    featureRequests: ["提升稳定性和关键流程"]
  };
}

function normalizeDraft(
  draft: FeedbackAnalysisDraft | undefined,
  reviews: ReviewEvidence[],
  language: Language
) {
  const fallback = getFallbackDraft(reviews, language);

  return {
    coreSummary: draft?.coreSummary?.trim() || fallback.coreSummary,
    signalCluster: draft?.signalCluster?.trim() || fallback.signalCluster,
    positiveFocus: draft?.positiveFocus?.trim() || fallback.positiveFocus,
    highFreqPainPoints: normalizeInsightList(
      draft?.highFreqPainPoints ?? [],
      fallback.highFreqPainPoints
    ),
    featureRequests: normalizeInsightList(
      draft?.featureRequests ?? [],
      fallback.featureRequests
    )
  };
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

function getReviewSearchText(review: ReviewEvidence) {
  return `${review.title ?? ""} ${review.text}`.toLowerCase();
}

function tokenizeForOverlap(value: string) {
  return new Set(
    (value.toLowerCase().match(/[a-z0-9]{3,}|[\u4e00-\u9fff]/g) ?? []).filter(
      Boolean
    )
  );
}

function scoreReviewForInsight(review: ReviewEvidence, insightTokens: Set<string>) {
  if (insightTokens.size === 0) {
    return 0;
  }

  const reviewTokens = tokenizeForOverlap(getReviewSearchText(review));
  let overlap = 0;

  insightTokens.forEach((token) => {
    if (reviewTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap;
}

function resolveInsightEvidenceIds(
  insight: string,
  reviews: ReviewEvidence[],
  fallbackSentiment: ReviewSentiment,
  fallbackOffset: number
) {
  const insightTokens = tokenizeForOverlap(insight);
  const ids = reviews
    .map((review) => ({
      review,
      score:
        scoreReviewForInsight(review, insightTokens) +
        (isHighValueReview(review) ? 0.25 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, EVIDENCE_REVIEWS_PER_CARD)
    .map((item) => item.review.snippetId);

  if (ids.length > 0) {
    return ids;
  }

  return getFallbackEvidenceIds(reviews, fallbackSentiment, fallbackOffset);
}

function isLikelyMakerVoice(review: ReviewEvidence) {
  if (review.source !== "product-hunt") {
    return false;
  }

  return PRODUCT_HUNT_MAKER_VOICE_RE.test(
    `${review.title ?? ""} ${review.text}`.replace(/\s+/g, " ").trim()
  );
}

function getTypicalVoiceLengthScore(textLength: number) {
  if (textLength <= 0) {
    return -10;
  }

  if (textLength < 24) {
    return textLength / 6;
  }

  if (textLength <= 260) {
    return 10 + Math.min(10, (textLength - 24) / 24);
  }

  return Math.max(4, 20 - Math.min(16, (textLength - 260) / 30));
}

function scoreReviewForTypicalVoice(
  review: ReviewEvidence,
  sentiment: ReviewSentiment
) {
  const textLength = review.text.trim().length;
  const rating = typeof review.rating === "number" ? review.rating : undefined;
  const votes = typeof review.votes === "number" ? review.votes : 0;
  let score = getTypicalVoiceLengthScore(textLength);

  if (review.source === "product-hunt") {
    const sentimentScore = getProductHuntTextSentimentScore(review);

    if (sentiment === "positive") {
      score += sentimentScore.positive * 2;
    } else if (sentiment === "negative") {
      score += sentimentScore.negative * 2;
    } else if (sentimentScore.positive + sentimentScore.negative === 0) {
      score += 3;
    }
  } else if (rating !== undefined) {
    score += 6;
  }

  if (HIGH_VALUE_KEYWORD_RE.test(`${review.title ?? ""} ${review.text}`)) {
    score += sentiment === "negative" ? 4 : 2;
  }

  score += Math.min(4, Math.log2(Math.max(0, votes) + 1) * 1.2);

  if (textLength > 420) {
    score -= Math.min(18, (textLength - 420) / 45);
  }

  if (isLikelyMakerVoice(review)) {
    score -= 12;
  }

  return score;
}

function compareTypicalVoiceReviews(sentiment: ReviewSentiment) {
  return (left: ReviewEvidence, right: ReviewEvidence) => {
    const leftMaker = isLikelyMakerVoice(left);
    const rightMaker = isLikelyMakerVoice(right);

    if (leftMaker !== rightMaker) {
      return leftMaker ? 1 : -1;
    }

    const scoreDelta =
      scoreReviewForTypicalVoice(right, sentiment) -
      scoreReviewForTypicalVoice(left, sentiment);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.reviewIndex - right.reviewIndex;
  };
}

function getTypicalVoiceReviews(
  reviews: ReviewEvidence[],
  sentiment: ReviewSentiment,
  limit = 1
) {
  const candidates = filterReviewsBySentiment(reviews, sentiment);

  if (candidates.length === 0) {
    return [];
  }

  return [...candidates].sort(compareTypicalVoiceReviews(sentiment)).slice(0, limit);
}

function getTypicalVoiceReview(
  reviews: ReviewEvidence[],
  sentiment: ReviewSentiment
) {
  return getTypicalVoiceReviews(reviews, sentiment)[0];
}

function getTypicalVoiceEvidenceIds(
  reviews: ReviewEvidence[],
  sentiment: ReviewSentiment
) {
  return getTypicalVoiceReviews(
    reviews,
    sentiment,
    EVIDENCE_REVIEWS_PER_CARD
  ).map((review) => review.snippetId);
}

function getTypicalVoices(reviews: ReviewEvidence[]) {
  return {
    positive: getTypicalVoiceReview(reviews, "positive")?.text ?? "",
    neutral: getTypicalVoiceReview(reviews, "neutral")?.text ?? "",
    negative: getTypicalVoiceReview(reviews, "negative")?.text ?? ""
  };
}

function buildEvidenceMap(
  analysis: AnalysisResult,
  reviews: ReviewEvidence[]
): EvidenceMap {
  return {
    painPoints: analysis.deepInsights.highFreqPainPoints.map((_, index) =>
      resolveInsightEvidenceIds(
        analysis.deepInsights.highFreqPainPoints[index] ?? "",
        reviews,
        "negative",
        index
      )
    ),
    featureRequests: analysis.deepInsights.featureRequests.map((_, index) =>
      resolveInsightEvidenceIds(
        analysis.deepInsights.featureRequests[index] ?? "",
        reviews,
        "negative",
        index
      )
    ),
    typicalVoices: {
      positive: getTypicalVoiceEvidenceIds(reviews, "positive"),
      neutral: getTypicalVoiceEvidenceIds(reviews, "neutral"),
      negative: getTypicalVoiceEvidenceIds(reviews, "negative")
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

function composeAnalysisResult(
  draft: FeedbackAnalysisDraft | undefined,
  reviews: ReviewEvidence[],
  language: Language
): AnalysisResult {
  const normalizedDraft = normalizeDraft(draft, reviews, language);
  const emotionDistribution = getEmotionDistribution(reviews);

  return {
    insightPreview: {
      comprehensiveScore: getComprehensiveScore(reviews),
      coreSummary: normalizedDraft.coreSummary
    },
    coreMetrics: {
      totalReviews: reviews.length,
      highValueSignals: getHighValueSignalCount(reviews),
      signalCluster: normalizedDraft.signalCluster,
      positiveRatio: emotionDistribution.positive,
      positiveFocus: normalizedDraft.positiveFocus
    },
    emotionDistribution,
    deepInsights: {
      highFreqPainPoints: normalizedDraft.highFreqPainPoints,
      featureRequests: normalizedDraft.featureRequests
    },
    typicalVoices: getTypicalVoices(reviews)
  };
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
  const analysisStart = performance.now();
  let aiStatus: "completed" | "fallback" = "completed";
  let draft: FeedbackAnalysisDraft | undefined;

  try {
    draft = await analyzeFeedback(
      buildReviewsText(selectedReviews, reviewTextMaxChars),
      modelType
    );
  } catch (error) {
    aiStatus = "fallback";
    console.info("[AI_ANALYSIS_FALLBACK]", {
      source: scrapeResult.source,
      provider: scrapeResult.provider,
      reviewCount: scrapeResult.count,
      aiReviewCount: selectedReviews.length,
      error
    });
  }

  const analysis = composeAnalysisResult(draft, reviews, language);
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
      analysisMs: elapsedMs(analysisStart),
      totalMs: elapsedMs(requestStart)
    },
    meta: {
      source: scrapeResult.source,
      provider: scrapeResult.provider,
      reviewCount: scrapeResult.count,
      aiReviewCount: selectedReviews.length,
      aiStatus,
      maxReviews,
      selectedReviewLimit,
      reviewTextMaxChars
    }
  };
}

export function __selectReviewsForAnalysisForTest(
  reviews: ReviewEvidence[],
  selectedReviewLimit?: number
) {
  return selectReviewsForAnalysis(reviews, selectedReviewLimit);
}
