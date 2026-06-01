import { randomUUID } from "node:crypto";
import { Client as QStashClient } from "@upstash/qstash";
import { Redis } from "@upstash/redis";
import {
  getAnalysisCacheTtlMs,
  getCachedAnalysis as getMemoryCachedAnalysis,
  setCachedAnalysis as setMemoryCachedAnalysis
} from "./analysis-cache.ts";
import type {
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
  cacheKey?: string;
  expiresAt: number;
  options?: Required<CreateAnalyzeJobOptions>;
};

type CreateAnalyzeJobSuccess = {
  ok: true;
  job: AnalyzeJobResponse;
};

type CreateAnalyzeJobFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  status: number;
};

export type CreateAnalyzeJobResult =
  | CreateAnalyzeJobSuccess
  | CreateAnalyzeJobFailure;

export type CreateAnalyzeJobOptions = {
  url: string;
  language: Language;
  maxReviews?: number;
  selectedReviewLimit?: number;
  reviewTextMaxChars?: number;
};

type AnalyzeQueuePublisher = (jobId: string) => Promise<void>;

const DEFAULT_WEB_ANALYSIS_MAX_REVIEWS = 50;
const DEFAULT_WEB_ANALYSIS_SELECTED_REVIEW_LIMIT = 12;
const DEFAULT_WEB_ANALYSIS_REVIEW_TEXT_MAX_CHARS = 280;
const DEFAULT_ANALYSIS_JOB_TTL_MS = 30 * 60 * 1000;
const DEFAULT_ANALYSIS_JOB_TIMEOUT_MS = 120_000;
const ANALYSIS_JOB_SLOT_RETRY_MS = 500;
const DEFAULT_QSTASH_QUEUE_NAME = "analysis-jobs";
const ANALYZE_JOBS_STORE_KEY = "__echosiftAnalyzeJobs";
const ANALYZE_ACTIVE_JOBS_STORE_KEY = "__echosiftAnalyzeActiveJobs";
const ANALYZE_JOB_LOCKS_STORE_KEY = "__echosiftAnalyzeJobLocks";

const globalForAnalyzeJobs = globalThis as typeof globalThis & {
  [ANALYZE_JOBS_STORE_KEY]?: Map<string, AnalyzeJobEntry>;
  [ANALYZE_ACTIVE_JOBS_STORE_KEY]?: Map<string, string>;
  [ANALYZE_JOB_LOCKS_STORE_KEY]?: Set<string>;
};

const memoryJobs =
  globalForAnalyzeJobs[ANALYZE_JOBS_STORE_KEY] ??
  (globalForAnalyzeJobs[ANALYZE_JOBS_STORE_KEY] = new Map<
    string,
    AnalyzeJobEntry
  >());

const memoryActiveJobs =
  globalForAnalyzeJobs[ANALYZE_ACTIVE_JOBS_STORE_KEY] ??
  (globalForAnalyzeJobs[ANALYZE_ACTIVE_JOBS_STORE_KEY] = new Map<
    string,
    string
  >());

const memoryJobLocks =
  globalForAnalyzeJobs[ANALYZE_JOB_LOCKS_STORE_KEY] ??
  (globalForAnalyzeJobs[ANALYZE_JOB_LOCKS_STORE_KEY] = new Set<string>());

let redisClient: Redis | undefined;
let qstashClient: QStashClient | undefined;
let queuePublisherForTest: AnalyzeQueuePublisher | undefined;

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

function getQStashQueueName() {
  return process.env.QSTASH_QUEUE_NAME?.trim() || DEFAULT_QSTASH_QUEUE_NAME;
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

function isTerminalStatus(status: AnalyzeJobStatus) {
  return status === "completed" || status === "failed";
}

function cleanupExpiredMemoryJobs(now = Date.now()) {
  for (const [jobId, entry] of Array.from(memoryJobs.entries())) {
    if (entry.expiresAt <= now) {
      memoryJobs.delete(jobId);
      if (entry.cacheKey && memoryActiveJobs.get(entry.cacheKey) === jobId) {
        memoryActiveJobs.delete(entry.cacheKey);
      }
    }
  }
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

function hasRedisConfig() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function hasQStashConfig() {
  return Boolean(
    process.env.QSTASH_TOKEN?.trim() &&
      process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim() &&
      getAppBaseUrl()
  );
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function shouldUsePersistentQueue() {
  return hasRedisConfig() && hasQStashConfig();
}

function getAppBaseUrl() {
  const explicitUrl = process.env.APP_BASE_URL?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  return vercelUrl ? `https://${vercelUrl.replace(/\/+$/, "")}` : undefined;
}

export function getAnalyzeWorkerUrl() {
  const appBaseUrl = getAppBaseUrl();

  return appBaseUrl ? `${appBaseUrl}/api/analyze/jobs/run` : undefined;
}

export function getQStashSignatureConfig() {
  return {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY?.trim(),
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY?.trim(),
    url: getAnalyzeWorkerUrl()
  };
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? ""
    });
  }

  return redisClient;
}

function getQStashClient() {
  if (!qstashClient) {
    qstashClient = new QStashClient({
      token: process.env.QSTASH_TOKEN?.trim()
    });
  }

  return qstashClient;
}

function jobKey(jobId: string) {
  return `analysis:job:${jobId}`;
}

function cacheKey(key: string) {
  return `analysis:cache:${key}`;
}

function activeKey(key: string) {
  return `analysis:active:${key}`;
}

function lockKey(jobId: string) {
  return `analysis:lock:${jobId}`;
}

async function getCachedResult(key: string) {
  if (!shouldUsePersistentQueue()) {
    return getMemoryCachedAnalysis(key);
  }

  return getRedisClient().get<AnalyzeJobResponse["result"]>(cacheKey(key));
}

async function setCachedResult(key: string, result: AnalyzeJobResponse["result"]) {
  if (!result) {
    return;
  }

  if (!shouldUsePersistentQueue()) {
    setMemoryCachedAnalysis(key, result);
    return;
  }

  await getRedisClient().set(cacheKey(key), result, {
    px: getAnalysisCacheTtlMs()
  });
}

async function storeJob(entry: AnalyzeJobEntry) {
  if (!shouldUsePersistentQueue()) {
    memoryJobs.set(entry.jobId, entry);
    return;
  }

  await getRedisClient().set(jobKey(entry.jobId), entry, {
    px: getAnalysisJobTtlMs()
  });
}

async function getJobEntry(jobId: string) {
  if (!shouldUsePersistentQueue()) {
    cleanupExpiredMemoryJobs();
    return memoryJobs.get(jobId);
  }

  return getRedisClient().get<AnalyzeJobEntry>(jobKey(jobId));
}

async function updateJob(
  jobId: string,
  patch: Partial<Pick<AnalyzeJobEntry, "status" | "result" | "error">>
) {
  const entry = await getJobEntry(jobId);

  if (!entry) {
    return;
  }

  Object.assign(entry, patch, {
    updatedAt: nowIso(),
    expiresAt: Date.now() + getAnalysisJobTtlMs()
  });

  await storeJob(entry);
}

async function getActiveJob(cacheKeyValue: string) {
  const activeJobId = shouldUsePersistentQueue()
    ? await getRedisClient().get<string>(activeKey(cacheKeyValue))
    : memoryActiveJobs.get(cacheKeyValue);

  if (!activeJobId) {
    return undefined;
  }

  const entry = await getJobEntry(activeJobId);

  if (!entry || isTerminalStatus(entry.status)) {
    await clearActiveJob(cacheKeyValue, activeJobId);
    return entry;
  }

  return entry;
}

async function setActiveJob(cacheKeyValue: string, jobId: string) {
  if (!shouldUsePersistentQueue()) {
    if (memoryActiveJobs.has(cacheKeyValue)) {
      return false;
    }

    memoryActiveJobs.set(cacheKeyValue, jobId);
    return true;
  }

  const result = await getRedisClient().set(activeKey(cacheKeyValue), jobId, {
    px: getAnalysisJobTtlMs(),
    nx: true
  });

  return result === "OK";
}

async function clearActiveJob(cacheKeyValue?: string, jobId?: string) {
  if (!cacheKeyValue) {
    return;
  }

  if (!shouldUsePersistentQueue()) {
    if (!jobId || memoryActiveJobs.get(cacheKeyValue) === jobId) {
      memoryActiveJobs.delete(cacheKeyValue);
    }
    return;
  }

  await getRedisClient().del(activeKey(cacheKeyValue));
}

async function acquireJobLock(jobId: string) {
  if (!shouldUsePersistentQueue()) {
    if (memoryJobLocks.has(jobId)) {
      return false;
    }

    memoryJobLocks.add(jobId);
    return true;
  }

  const result = await getRedisClient().set(lockKey(jobId), "1", {
    px: getAnalysisJobTimeoutMs(),
    nx: true
  });

  return result === "OK";
}

async function releaseJobLock(jobId: string) {
  if (!shouldUsePersistentQueue()) {
    memoryJobLocks.delete(jobId);
    return;
  }

  await getRedisClient().del(lockKey(jobId));
}

async function publishQueuedJob(jobId: string) {
  if (queuePublisherForTest) {
    await queuePublisherForTest(jobId);
    return;
  }

  if (!shouldUsePersistentQueue()) {
    void runQueuedAnalyzeJob(jobId).catch(async (error) => {
      console.error("[ANALYZE_JOB_FAILED]", {
        jobId,
        error
      });
      await updateJob(jobId, {
        status: "failed",
        error: {
          code: "ANALYZE_JOB_FAILED",
          message: "分析任务执行失败，请稍后重试。",
          status: 500
        }
      });
    });
    return;
  }

  const workerUrl = getAnalyzeWorkerUrl();

  if (!workerUrl) {
    throw new Error("MISSING_ANALYZE_WORKER_URL");
  }

  await getQStashClient().publishJSON({
    url: workerUrl,
    body: {
      jobId
    },
    deduplicationId: jobId,
    queueName: getQStashQueueName(),
    retries: 2
  });
}

function createCompletedJob(result: AnalyzeJobResponse["result"]) {
  const createdAt = nowIso();

  return toResponse({
    jobId: randomUUID(),
    status: "completed",
    createdAt,
    updatedAt: createdAt,
    elapsedMs: 0,
    result,
    expiresAt: Date.now() + getAnalysisJobTtlMs()
  });
}

function queueNotConfiguredFailure(): CreateAnalyzeJobFailure {
  return {
    ok: false,
    error: {
      code: "ANALYSIS_QUEUE_NOT_CONFIGURED",
      message:
        "生产环境缺少 Upstash Redis 或 QStash 配置，暂时无法创建异步分析任务。"
    },
    status: 503
  };
}

export async function createAnalyzeJob({
  url,
  language,
  maxReviews = getWebAnalysisMaxReviews(),
  selectedReviewLimit = getWebAnalysisSelectedReviewLimit(),
  reviewTextMaxChars = getWebAnalysisReviewTextMaxChars()
}: CreateAnalyzeJobOptions): Promise<CreateAnalyzeJobResult> {
  cleanupExpiredMemoryJobs();

  if (isProductionRuntime() && !shouldUsePersistentQueue()) {
    return queueNotConfiguredFailure();
  }

  const options: Required<CreateAnalyzeJobOptions> = {
    url,
    language,
    maxReviews,
    selectedReviewLimit,
    reviewTextMaxChars
  };
  const cacheKeyValue = getJobCacheKey(options);
  const cachedAnalysis = await getCachedResult(cacheKeyValue);

  if (cachedAnalysis) {
    return {
      ok: true,
      job: createCompletedJob(cachedAnalysis)
    };
  }

  const activeJob = await getActiveJob(cacheKeyValue);

  if (activeJob && !isTerminalStatus(activeJob.status)) {
    return {
      ok: true,
      job: toResponse(activeJob)
    };
  }

  const jobId = randomUUID();
  const createdAt = nowIso();
  const entry: AnalyzeJobEntry = {
    jobId,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    elapsedMs: 0,
    cacheKey: cacheKeyValue,
    options,
    expiresAt: Date.now() + getAnalysisJobTtlMs()
  };

  const activeSet = await setActiveJob(cacheKeyValue, jobId);

  if (!activeSet) {
    const currentActiveJob = await getActiveJob(cacheKeyValue);

    if (currentActiveJob) {
      return {
        ok: true,
        job: toResponse(currentActiveJob)
      };
    }
  }

  await storeJob(entry);

  try {
    await publishQueuedJob(jobId);
  } catch (error) {
    await clearActiveJob(cacheKeyValue, jobId);
    await updateJob(jobId, {
      status: "failed",
      error: {
        code: "ANALYSIS_QUEUE_PUBLISH_FAILED",
        message: "分析任务排队失败，请稍后重试。",
        status: 502
      }
    });
    console.error("[ANALYZE_JOB_QUEUE_FAILED]", {
      jobId,
      error
    });

    return {
      ok: false,
      error: {
        code: "ANALYSIS_QUEUE_PUBLISH_FAILED",
        message: "分析任务排队失败，请稍后重试。"
      },
      status: 502
    };
  }

  return {
    ok: true,
    job: toResponse(entry)
  };
}

export async function runQueuedAnalyzeJob(jobId: string) {
  const entry = await getJobEntry(jobId);

  if (!entry?.options || !entry.cacheKey || isTerminalStatus(entry.status)) {
    return;
  }

  const hasLock = await acquireJobLock(jobId);

  if (!hasLock) {
    return;
  }

  const jobStart = performance.now();
  const jobTimeoutMs = getAnalysisJobTimeoutMs();
  let stageUpdate = Promise.resolve();
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
        url: entry.options.url,
        language: entry.options.language,
        maxReviews: entry.options.maxReviews,
        selectedReviewLimit: entry.options.selectedReviewLimit,
        reviewTextMaxChars: entry.options.reviewTextMaxChars,
        onStage: (stage: AnalyzePipelineStage) => {
          stageUpdate = stageUpdate.then(() =>
            updateJob(jobId, {
              status: stage
            })
          );
        }
      }),
      remainingTimeoutMs
    );
    await stageUpdate;

    if (!result.ok) {
      console.info("[ANALYZE_JOB_TIMING]", {
        jobId,
        ...result.meta,
        ...result.timings
      });
      await updateJob(jobId, {
        status: "failed",
        error: {
          code: result.error.code,
          message: result.error.message,
          status: result.status
        }
      });
      await clearActiveJob(entry.cacheKey, jobId);
      return;
    }

    console.info("[ANALYZE_JOB_TIMING]", {
      jobId,
      ...result.meta,
      ...result.timings,
      stage: result.response.reviewCount === 0 ? "empty_reviews" : "completed"
    });

    if (result.response.reviewCount > 0) {
      await setCachedResult(entry.cacheKey, result.response);
    }

    await updateJob(jobId, {
      status: "completed",
      result: result.response
    });
    await clearActiveJob(entry.cacheKey, jobId);
  } catch (error) {
    if (error instanceof Error && error.message === "ANALYZE_JOB_TIMEOUT") {
      console.info("[ANALYZE_JOB_TIMING]", {
        jobId,
        maxReviews: entry.options.maxReviews,
        selectedReviewLimit: entry.options.selectedReviewLimit,
        reviewTextMaxChars: entry.options.reviewTextMaxChars,
        stage: "job_timeout",
        totalMs: Math.round(performance.now() - jobStart)
      });
      await updateJob(jobId, {
        status: "failed",
        error: {
          code: "ANALYZE_JOB_TIMEOUT",
          message: "分析任务耗时过长，请稍后重试或减少评论数量。",
          status: 504
        }
      });
      await clearActiveJob(entry.cacheKey, jobId);
      return;
    }

    throw error;
  } finally {
    analysisSlot?.release();
    await releaseJobLock(jobId);
  }
}

export async function getAnalyzeJob(jobId: string) {
  cleanupExpiredMemoryJobs();
  const entry = await getJobEntry(jobId);

  return entry ? toResponse(entry) : undefined;
}

export function __clearAnalyzeJobsForTest() {
  memoryJobs.clear();
  memoryActiveJobs.clear();
  memoryJobLocks.clear();
  queuePublisherForTest = undefined;
  redisClient = undefined;
  qstashClient = undefined;
}

export function __setAnalyzeJobQueuePublisherForTest(
  publisher?: AnalyzeQueuePublisher
) {
  queuePublisherForTest = publisher;
}
