import { randomUUID } from "node:crypto";
import {
  getCachedAnalysis,
  setCachedAnalysis
} from "./analysis-cache.ts";
import type {
  AnalyzeApiResponse,
  AnalyzeJobError,
  AnalyzeJobResponse,
  AnalyzeJobStatus
} from "./analysis-types.ts";
import {
  type AnalyzePipelineStage,
  runAnalyzePipeline
} from "./analyze-pipeline.ts";
import {
  createAnalysisCacheKey,
  tryAcquireAnalysisSlot
} from "./api-guards.ts";
import type { Language } from "./mock-data.ts";

type AnalyzeJobEntry = AnalyzeJobResponse & {
  expiresAt: number;
};

export type CreateAnalyzeJobOptions = {
  url: string;
  language: Language;
  maxReviews?: number;
  selectedReviewLimit?: number;
  reviewTextMaxChars?: number;
};

const DEFAULT_WEB_ANALYSIS_MAX_REVIEWS = 100;
const DEFAULT_WEB_ANALYSIS_SELECTED_REVIEW_LIMIT = 40;
const DEFAULT_WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS = 600;
const DEFAULT_ANALYSIS_JOB_TTL_MS = 30 * 60 * 1000;
const ANALYSIS_JOB_SLOT_RETRY_MS = 500;

const jobs = new Map<string, AnalyzeJobEntry>();

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getWebAnalysisMaxReviews() {
  return getPositiveIntegerEnv(
    "WEB_ANALYSIS_MAX_REVIEWS",
    DEFAULT_WEB_ANALYSIS_MAX_REVIEWS
  );
}

export function getWebAnalysisSelectedReviewLimit() {
  return getPositiveIntegerEnv(
    "WEB_ANALYSIS_SELECTED_REVIEW_LIMIT",
    DEFAULT_WEB_ANALYSIS_SELECTED_REVIEW_LIMIT
  );
}

export function getWebAnalysisReviewTextMaxChars() {
  return getPositiveIntegerEnv(
    "WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS",
    DEFAULT_WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS
  );
}

export function getAnalysisJobTtlMs() {
  return getPositiveIntegerEnv(
    "ANALYSIS_JOB_TTL_MS",
    DEFAULT_ANALYSIS_JOB_TTL_MS
  );
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function elapsedMs(createdAt: string, now = Date.now()) {
  return Math.max(0, now - Date.parse(createdAt));
}

function toResponse(entry: AnalyzeJobEntry, now = Date.now()): AnalyzeJobResponse {
  return {
    jobId: entry.jobId,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    elapsedMs: elapsedMs(entry.createdAt, now),
    result: entry.result,
    error: entry.error
  };
}

function cleanupExpiredJobs(now = Date.now()) {
  for (const [jobId, entry] of Array.from(jobs.entries())) {
    if (entry.expiresAt <= now) {
      jobs.delete(jobId);
    }
  }
}

function updateJob(
  jobId: string,
  patch: Partial<Pick<AnalyzeJobEntry, "status" | "result" | "error">>
) {
  const entry = jobs.get(jobId);

  if (!entry) {
    return;
  }

  Object.assign(entry, patch, {
    updatedAt: nowIso(),
    expiresAt: Date.now() + getAnalysisJobTtlMs()
  });
}

function getJobCacheKey({
  url,
  language,
  maxReviews,
  selectedReviewLimit,
  reviewTextMaxChars
}: Required<CreateAnalyzeJobOptions>) {
  return createAnalysisCacheKey(url, language, {
    maxReviews,
    selectedReviewLimit,
    reviewTextMaxChars
  });
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function acquireJobAnalysisSlot() {
  let slot = tryAcquireAnalysisSlot();

  while (!slot.ok) {
    await wait(ANALYSIS_JOB_SLOT_RETRY_MS);
    slot = tryAcquireAnalysisSlot();
  }

  return slot;
}

async function runJob(
  jobId: string,
  options: Required<CreateAnalyzeJobOptions>,
  cacheKey: string
) {
  const analysisSlot = await acquireJobAnalysisSlot();

  try {
    const result = await runAnalyzePipeline({
      url: options.url,
      language: options.language,
      maxReviews: options.maxReviews,
      selectedReviewLimit: options.selectedReviewLimit,
      reviewTextMaxChars: options.reviewTextMaxChars,
      onStage: (stage: AnalyzePipelineStage) => {
        updateJob(jobId, {
          status: stage
        });
      }
    });

    if (!result.ok) {
      console.info("[ANALYZE_JOB_TIMING]", {
        jobId,
        ...result.meta,
        ...result.timings
      });
      updateJob(jobId, {
        status: "failed",
        error: {
          code: result.error.code,
          message: result.error.message,
          status: result.status
        }
      });
      return;
    }

    console.info("[ANALYZE_JOB_TIMING]", {
      jobId,
      ...result.meta,
      ...result.timings,
      stage: result.response.reviewCount === 0 ? "empty_reviews" : "completed"
    });

    if (result.response.reviewCount > 0) {
      setCachedAnalysis(cacheKey, result.response);
    }

    updateJob(jobId, {
      status: "completed",
      result: result.response
    });
  } finally {
    analysisSlot.release();
  }
}

export function createAnalyzeJob({
  url,
  language,
  maxReviews = getWebAnalysisMaxReviews(),
  selectedReviewLimit = getWebAnalysisSelectedReviewLimit(),
  reviewTextMaxChars = getWebAnalysisReviewTextMaxChars()
}: CreateAnalyzeJobOptions) {
  cleanupExpiredJobs();

  const jobId = randomUUID();
  const createdAt = nowIso();
  const cacheKey = getJobCacheKey({
    url,
    language,
    maxReviews,
    selectedReviewLimit,
    reviewTextMaxChars
  });
  const cachedAnalysis = getCachedAnalysis(cacheKey);
  const entry: AnalyzeJobEntry = {
    jobId,
    status: cachedAnalysis ? "completed" : "queued",
    createdAt,
    updatedAt: createdAt,
    elapsedMs: 0,
    result: cachedAnalysis,
    expiresAt: Date.now() + getAnalysisJobTtlMs()
  };

  jobs.set(jobId, entry);

  if (!cachedAnalysis) {
    void runJob(
      jobId,
      {
        url,
        language,
        maxReviews,
        selectedReviewLimit,
        reviewTextMaxChars
      },
      cacheKey
    ).catch((error) => {
      console.error("[ANALYZE_JOB_FAILED]", {
        jobId,
        error
      });
      updateJob(jobId, {
        status: "failed",
        error: {
          code: "ANALYZE_JOB_FAILED",
          message: "分析任务执行失败，请稍后重试。",
          status: 500
        }
      });
    });
  }

  return toResponse(entry);
}

export function getAnalyzeJob(jobId: string) {
  cleanupExpiredJobs();
  const entry = jobs.get(jobId);

  return entry ? toResponse(entry) : undefined;
}

export function __clearAnalyzeJobsForTest() {
  jobs.clear();
}
