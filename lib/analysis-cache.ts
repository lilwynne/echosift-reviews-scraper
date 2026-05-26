import type { AnalyzeApiResponse } from "./analysis-types.ts";

type CacheEntry = {
  expiresAt: number;
  value: AnalyzeApiResponse;
};

const DEFAULT_ANALYSIS_CACHE_TTL_SECONDS = 3 * 24 * 60 * 60;
const analysisCache = new Map<string, CacheEntry>();

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getAnalysisCacheTtlMs() {
  return (
    getPositiveIntegerEnv(
      "ANALYSIS_CACHE_TTL_SECONDS",
      DEFAULT_ANALYSIS_CACHE_TTL_SECONDS
    ) * 1000
  );
}

export function getCachedAnalysis(key: string, now = Date.now()) {
  const entry = analysisCache.get(key);

  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= now) {
    analysisCache.delete(key);
    return undefined;
  }

  return entry.value;
}

export function setCachedAnalysis(
  key: string,
  value: AnalyzeApiResponse,
  ttlMs = getAnalysisCacheTtlMs(),
  now = Date.now()
) {
  analysisCache.set(key, {
    expiresAt: now + ttlMs,
    value
  });
}

export function __clearAnalysisCacheForTest() {
  analysisCache.clear();
}
