import type { AnalysisResult } from "./analysis-types.ts";

export function createEmptyAnalysisResult(): AnalysisResult {
  return {
    insightPreview: {
      comprehensiveScore: 0,
      coreSummary: "无有效评论可分析"
    },
    coreMetrics: {
      totalReviews: 0,
      highValueSignals: 0,
      signalCluster: "无信号",
      positiveRatio: 0,
      positiveFocus: "无正面评价"
    },
    emotionDistribution: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    deepInsights: {
      highFreqPainPoints: [],
      featureRequests: [],
      painPointEvidenceReviewIndexes: [],
      featureRequestEvidenceReviewIndexes: []
    },
    typicalVoices: {
      positive: "",
      neutral: "",
      negative: ""
    },
    typicalVoiceEvidenceReviewIndexes: {
      positive: [],
      neutral: [],
      negative: []
    }
  };
}
