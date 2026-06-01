export type AnalyzeMessage = {
  type: "ANALYZE_CURRENT_PAGE"
  payload: {
    url: string
    language: "zh-CN"
  }
}

export type AnalyzeResponseMeta = {
  elapsedMs: number
  fromCache?: boolean
  sharedRequest?: boolean
}

export type ReviewSentiment = "positive" | "neutral" | "negative"

export type AnalyzeApiResponse = {
  sourceUrl: string
  language: string
  scrapeSource: string
  scrapeProvider?: string
  reviewCount: number
  analysis: {
    insightPreview: {
      comprehensiveScore: number
      coreSummary: string
    }
    coreMetrics?: {
      totalReviews: number
      highValueSignals: number
      signalCluster: string
      positiveRatio: number
      positiveFocus: string
    }
    emotionDistribution: Record<ReviewSentiment, number>
    deepInsights: {
      highFreqPainPoints: string[]
      featureRequests: string[]
    }
    typicalVoices: Record<ReviewSentiment, string>
  }
}

export type AnalyzeJobStatus =
  | "queued"
  | "scraping"
  | "analyzing"
  | "completed"
  | "failed"

export type AnalyzeJobResponse = {
  jobId: string
  status: AnalyzeJobStatus
  createdAt: string
  updatedAt: string
  elapsedMs: number
  result?: AnalyzeApiResponse
  error?: {
    code: string
    message: string
    status: number
  }
}

export type AnalyzeMessageResponse =
  | {
      ok: true
      data: AnalyzeApiResponse
      meta?: AnalyzeResponseMeta
    }
  | {
      ok: false
      error: string
      meta?: AnalyzeResponseMeta
    }

export type AnalyzeStatus = "idle" | "loading" | "success" | "error"
