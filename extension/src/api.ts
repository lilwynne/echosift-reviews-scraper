import type { AnalyzeApiResponse, AnalyzeJobResponse } from "~src/types"

const DEFAULT_API_BASE_URL = "https://echosift.online"
const DEFAULT_ANALYSIS_TIMEOUT_MS = 120_000
const POLL_INTERVAL_MS = 1500

const API_BASE_URL =
  process.env.PLASMO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  DEFAULT_API_BASE_URL

const ANALYSIS_TIMEOUT_MS = getPositiveIntegerEnv(
  "PLASMO_PUBLIC_ANALYSIS_TIMEOUT_MS",
  DEFAULT_ANALYSIS_TIMEOUT_MS
)

type AnalyzeRequest = {
  url: string
  language: "zh-CN"
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    value.error &&
    typeof value.error === "object" &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message
  }

  return fallback
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    const timeoutId = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, ms)
    const abort = () => {
      globalThis.clearTimeout(timeoutId)
      reject(new DOMException("Aborted", "AbortError"))
    }

    signal.addEventListener("abort", abort, { once: true })
  })
}

async function readJsonResponse<T>(response: Response, fallbackError: string) {
  const json = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(getErrorMessage(json, fallbackError))
  }

  return json as T
}

async function createAnalyzeJob(payload: AnalyzeRequest, signal: AbortSignal) {
  const response = await fetch(`${API_BASE_URL}/api/analyze/jobs`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  })

  return readJsonResponse<AnalyzeJobResponse>(
    response,
    "分析任务创建失败，请稍后重试。"
  )
}

async function fetchAnalyzeJob(jobId: string, signal: AbortSignal) {
  const response = await fetch(
    `${API_BASE_URL}/api/analyze/jobs/${encodeURIComponent(jobId)}`,
    {
      cache: "no-store",
      signal
    }
  )

  return readJsonResponse<AnalyzeJobResponse>(
    response,
    "分析任务查询失败，请稍后重试。"
  )
}

export async function requestAnalysis(payload: AnalyzeRequest) {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort()
  }, ANALYSIS_TIMEOUT_MS)

  try {
    let job = await createAnalyzeJob(payload, controller.signal)

    while (job.status !== "completed") {
      if (job.status === "failed") {
        throw new Error(job.error?.message ?? "分析失败，请稍后重试。")
      }

      await wait(POLL_INTERVAL_MS, controller.signal)
      job = await fetchAnalyzeJob(job.jobId, controller.signal)
    }

    if (!job.result) {
      throw new Error("分析任务没有返回结果，请稍后重试。")
    }

    return job.result as AnalyzeApiResponse
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("分析请求超时，请稍后重试。")
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}
