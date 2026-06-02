import { createHash } from "node:crypto";
import type { Language } from "./mock-data.ts";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export type AnalysisSlot =
  | {
      ok: true;
      active: number;
      limit: number;
      release: () => void;
    }
  | {
      ok: false;
      active: number;
      limit: number;
    };

const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_ANALYSIS_CONCURRENCY_LIMIT = 2;

const rateLimitEntries = new Map<string, RateLimitEntry>();
let activeAnalysisRequests = 0;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getClientIp(headers: Headers) {
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (forwardedFor) {
    return forwardedFor;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getAnalyzeRateLimitConfig() {
  return {
    limit: getPositiveIntegerEnv(
      "ANALYZE_RATE_LIMIT_MAX_REQUESTS",
      DEFAULT_RATE_LIMIT_MAX_REQUESTS
    ),
    windowMs: getPositiveIntegerEnv(
      "ANALYZE_RATE_LIMIT_WINDOW_MS",
      DEFAULT_RATE_LIMIT_WINDOW_MS
    )
  };
}

export function checkRateLimit({
  identifier,
  pathname,
  limit = getAnalyzeRateLimitConfig().limit,
  windowMs = getAnalyzeRateLimitConfig().windowMs,
  now = Date.now()
}: {
  identifier: string;
  pathname: string;
  limit?: number;
  windowMs?: number;
  now?: number;
}): RateLimitResult {
  const key = `${identifier || "unknown"}:${pathname || "/"}`;
  const current = rateLimitEntries.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitEntries.set(key, {
      count: 1,
      resetAt
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: current.resetAt
    };
  }

  current.count += 1;

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt
  };
}

export function getRequestPathname(request: Request) {
  try {
    return new URL(request.url).pathname || "/";
  } catch {
    return "/";
  }
}

export function getAnalysisConcurrencyLimit() {
  return getPositiveIntegerEnv(
    "ANALYSIS_CONCURRENCY_LIMIT",
    DEFAULT_ANALYSIS_CONCURRENCY_LIMIT
  );
}

export function tryAcquireAnalysisSlot(
  limit = getAnalysisConcurrencyLimit()
): AnalysisSlot {
  if (activeAnalysisRequests >= limit) {
    return {
      ok: false,
      active: activeAnalysisRequests,
      limit
    };
  }

  activeAnalysisRequests += 1;
  let released = false;

  return {
    ok: true,
    active: activeAnalysisRequests,
    limit,
    release: () => {
      if (released) {
        return;
      }

      released = true;
      activeAnalysisRequests = Math.max(0, activeAnalysisRequests - 1);
    }
  };
}

export function normalizeAnalysisUrl(url: string) {
  const parsedUrl = new URL(url.trim());

  parsedUrl.protocol = parsedUrl.protocol.toLowerCase();
  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
  parsedUrl.hash = "";

  const sortedSearchParams = Array.from(parsedUrl.searchParams.entries()).sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  );

  parsedUrl.search = "";

  for (const [key, value] of sortedSearchParams) {
    parsedUrl.searchParams.append(key, value);
  }

  return parsedUrl.toString();
}

export type AnalysisCacheKeyOptions = {
  maxReviews?: number;
  selectedReviewLimit?: number;
  reviewTextMaxChars?: number;
  modelType?: string;
};

export function createAnalysisCacheKey(
  url: string,
  language: Language,
  options: AnalysisCacheKeyOptions = {}
) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        url: normalizeAnalysisUrl(url),
        language,
        maxReviews: options.maxReviews ?? null,
        selectedReviewLimit: options.selectedReviewLimit ?? null,
        reviewTextMaxChars: options.reviewTextMaxChars ?? null,
        modelType: options.modelType ?? null
      })
    )
    .digest("hex")
    .slice(0, 32);

  return `analysis:v5:${hash}`;
}

export function __resetApiGuardsForTest() {
  rateLimitEntries.clear();
  activeAnalysisRequests = 0;
}
