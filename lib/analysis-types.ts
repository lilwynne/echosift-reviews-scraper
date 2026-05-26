import type { Language } from "@/lib/mock-data";

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
  };
  typicalVoices: {
    positive: string;
    neutral: string;
    negative: string;
  };
};

export type AnalyzeApiResponse = {
  sourceUrl: string;
  language: Language;
  scrapeSource: string;
  reviewCount: number;
  analysis: AnalysisResult;
};
