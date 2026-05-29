import type { AnalyzeApiResponse } from "~src/types"

const DEFAULT_API_BASE_URL = "https://echosift.online"
const DEFAULT_ANALYSIS_TIMEOUT_MS = 90_000

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

export async function requestAnalysis(payload: AnalyzeRequest) {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort()
  }, ANALYSIS_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("分析请求超时，请稍后重试。")
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }

  const json = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(getErrorMessage(json, `分析请求失败：${response.status}`))
  }

  return json as AnalyzeApiResponse
}
