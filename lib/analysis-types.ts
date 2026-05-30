import type { Language } from "@/lib/mock-data";
import type { NormalizedReview } from "@/lib/reviews";

export type ReviewSentiment = "positive" | "neutral" | "negative";

export type ReviewEvidence = NormalizedReview & {
  snippetId: string;
  reviewIndex: number;
};

export type EvidenceMap = {
  painPoints: string[][];
  featureRequests: string[][];
  typicalVoices: Record<ReviewSentiment, string[]>;
};

export type AnalysisResult = {
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
  typicalVoiceEvidenceReviewIndexes?: Partial<Record<ReviewSentiment, number[]>>;
};

export type AnalyzeApiResponse = {
  sourceUrl: string;
  language: Language;
  scrapeSource: string;
  scrapeProvider?: string;
  reviewCount: number;
  reviews: ReviewEvidence[];
  evidence: EvidenceMap;
  analysis: AnalysisResult;
};

export type AnalyzeJobStatus =
  | "queued"
  | "scraping"
  | "analyzing"
  | "completed"
  | "failed";

export type AnalyzeJobError = {
  code: string;
  message: string;
  status: number;
};

export type AnalyzeJobResponse = {
  jobId: string;
  status: AnalyzeJobStatus;
  createdAt: string;
  updatedAt: string;
  elapsedMs: number;
  result?: AnalyzeApiResponse;
  error?: AnalyzeJobError;
};
