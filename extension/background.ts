import { requestAnalysis } from "~src/api"
import type {
  AnalyzeApiResponse,
  AnalyzeMessage,
  AnalyzeMessageResponse
} from "~src/types"
import { normalizeAnalysisUrl } from "~src/url-rules"

type CacheEntry = {
  expiresAt: number
  data: AnalyzeApiResponse
}

type SharedRequest = {
  promise: Promise<AnalyzeMessageResponse>
}

const CACHE_PREFIX = "analysis:v2:"
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000
const memoryCache = new Map<string, CacheEntry>()
const inFlightRequests = new Map<string, SharedRequest>()

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function getCacheTtlMs() {
  return getPositiveIntegerEnv(
    "PLASMO_PUBLIC_ANALYSIS_CACHE_TTL_MS",
    DEFAULT_CACHE_TTL_MS
  )
}

function elapsedMs(start: number) {
  return Math.round(performance.now() - start)
}

function getCacheStorage() {
  return chrome.storage?.session
}

function createCacheKey(payload: AnalyzeMessage["payload"]) {
  return `${CACHE_PREFIX}${payload.language}:${normalizeAnalysisUrl(payload.url)}`
}

async function getCachedAnalysis(key: string, now = Date.now()) {
  const memoryEntry = memoryCache.get(key)

  if (memoryEntry) {
    if (memoryEntry.expiresAt > now) {
      return memoryEntry.data
    }

    memoryCache.delete(key)
  }

  const storage = getCacheStorage()

  if (!storage) {
    return undefined
  }

  let item: Record<string, unknown>

  try {
    item = await storage.get(key)
  } catch {
    return undefined
  }

  const storedEntry = item[key] as CacheEntry | undefined

  if (!storedEntry) {
    return undefined
  }

  if (storedEntry.expiresAt <= now) {
    await storage.remove(key).catch(() => undefined)
    return undefined
  }

  memoryCache.set(key, storedEntry)
  return storedEntry.data
}

async function setCachedAnalysis(
  key: string,
  data: AnalyzeApiResponse,
  now = Date.now()
) {
  const entry: CacheEntry = {
    data,
    expiresAt: now + getCacheTtlMs()
  }

  memoryCache.set(key, entry)

  const storage = getCacheStorage()

  if (storage) {
    await storage.set({
      [key]: entry
    }).catch(() => undefined)
  }
}

async function analyzeWithCache(
  payload: AnalyzeMessage["payload"]
): Promise<AnalyzeMessageResponse> {
  const requestStart = performance.now()
  let cacheKey: string

  try {
    cacheKey = createCacheKey(payload)
  } catch {
    return {
      ok: false,
      error: "请输入有效的产品链接。",
      meta: {
        elapsedMs: elapsedMs(requestStart)
      }
    }
  }

  const cachedAnalysis = await getCachedAnalysis(cacheKey)

  if (cachedAnalysis) {
    return {
      ok: true,
      data: cachedAnalysis,
      meta: {
        elapsedMs: elapsedMs(requestStart),
        fromCache: true
      }
    }
  }

  const activeRequest = inFlightRequests.get(cacheKey)

  if (activeRequest) {
    const response = await activeRequest.promise

    return {
      ...response,
      meta: {
        ...response.meta,
        elapsedMs: elapsedMs(requestStart),
        sharedRequest: true
      }
    }
  }

  const sharedRequest: SharedRequest = {
    promise: requestAnalysis(payload)
      .then(async (data) => {
        if (data.reviewCount > 0) {
          await setCachedAnalysis(cacheKey, data)
        }

        return {
          ok: true,
          data,
          meta: {
            elapsedMs: elapsedMs(requestStart)
          }
        } satisfies AnalyzeMessageResponse
      })
      .catch(
        (error) =>
          ({
            ok: false,
            error: error instanceof Error ? error.message : "分析失败",
            meta: {
              elapsedMs: elapsedMs(requestStart)
            }
          }) satisfies AnalyzeMessageResponse
      )
      .finally(() => {
        inFlightRequests.delete(cacheKey)
      })
  }

  inFlightRequests.set(cacheKey, sharedRequest)

  return sharedRequest.promise
}

chrome.runtime.onMessage.addListener(
  (
    message: AnalyzeMessage,
    _sender,
    sendResponse: (response: AnalyzeMessageResponse) => void
  ) => {
    if (message.type !== "ANALYZE_CURRENT_PAGE") {
      return false
    }

    analyzeWithCache(message.payload).then(sendResponse)

    return true
  }
)
