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

const DEFAULT_WEB_ANALYSIS_MAX_REVIEWS = 50;
const DEFAULT_WEB_ANALYSIS_SELECTED_REVIEW_LIMIT = 24;
const DEFAULT_WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS = 500;
const DEFAULT_ANALYSIS_JOB_TTL_MS = 30 * 60 * 1000;
const DEFAULT_ANALYSIS_JOB_TIMEOUT_MS = 45_000;
const ANALYSIS_JOB_SLOT_RETRY_MS = 500;
const ANALYZE_JOBS_STORE_KEY = "__echosiftAnalyzeJobs";

const globalForAnalyzeJobs = globalThis as typeof globalThis & {
  [ANALYZE_JOBS_STORE_KEY]?: Map<string, AnalyzeJobEntry>;
};

const jobs =
  globalForAnalyzeJobs[ANALYZE_JOBS_STORE_KEY] ??
  (globalForAnalyzeJobs[ANALYZE_JOBS_STORE_KEY] = new Map<
    string,
    AnalyzeJobEntry
  >());

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

export function getAnalysisJobTimeoutMs() {
  return getPositiveIntegerEnv(
    "ANALYSIS_JOB_TIMEOUT_MS",
    DEFAULT_ANALYSIS_JOB_TIMEOUT_MS
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

function createJobTimeoutError() {
  const error = new Error("ANALYZE_JOB_TIMEOUT");
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
          reject(createJobTimeoutError());
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function acquireJobAnalysisSlot(timeoutMs: number) {
  const deadlineAt = Date.now() + timeoutMs;
  let slot = tryAcquireAnalysisSlot();

  while (!slot.ok) {
    const remainingMs = deadlineAt - Date.now();

    if (remainingMs <= 0) {
      throw createJobTimeoutError();
    }

    await wait(Math.min(ANALYSIS_JOB_SLOT_RETRY_MS, remainingMs));
    slot = tryAcquireAnalysisSlot();
  }

  return slot;
}

async function runJob(
  jobId: string,
  options: Required<CreateAnalyzeJobOptions>,
  cacheKey: string
) {
  const jobStart = performance.now();
  const jobTimeoutMs = getAnalysisJobTimeoutMs();
  let analysisSlot:
    | Awaited<ReturnType<typeof acquireJobAnalysisSlot>>
    | undefined;

  try {
    analysisSlot = await acquireJobAnalysisSlot(jobTimeoutMs);
    const remainingTimeoutMs = Math.max(
      1,
      jobTimeoutMs - Math.round(performance.now() - jobStart)
    );
    const result = await withTimeout(
      runAnalyzePipeline({
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
      }),
      remainingTimeoutMs
    );

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
  } catch (error) {
    if (error instanceof Error && error.message === "ANALYZE_JOB_TIMEOUT") {
      console.info("[ANALYZE_JOB_TIMING]", {
        jobId,
        maxReviews: options.maxReviews,
        selectedReviewLimit: options.selectedReviewLimit,
        reviewTextMaxChars: options.reviewTextMaxChars,
        stage: "job_timeout",
        totalMs: Math.round(performance.now() - jobStart)
      });
      updateJob(jobId, {
        status: "failed",
        error: {
          code: "ANALYZE_JOB_TIMEOUT",
          message: "分析任务耗时过长，请稍后重试或减少评论数量。",
          status: 504
        }
      });
      return;
    }

    throw error;
  } finally {
    analysisSlot?.release();
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
