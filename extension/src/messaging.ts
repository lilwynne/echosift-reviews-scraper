import type { AnalyzeMessageResponse } from "~src/types"

const RUNTIME_UNAVAILABLE_ERROR =
  "扩展运行环境未就绪，请在 chrome://extensions 重新加载 EchoSift 后刷新当前页面。"

function getExtensionRuntime() {
  if (typeof chrome === "undefined") {
    return undefined
  }

  const runtime = chrome.runtime

  if (!runtime || typeof runtime.sendMessage !== "function") {
    return undefined
  }

  return runtime
}

function getMessageError(error: unknown) {
  if (!(error instanceof Error)) {
    return "无法连接扩展后台"
  }

  if (
    /Extension context invalidated/i.test(error.message) ||
    /Cannot read properties of undefined \(reading 'sendMessage'\)/i.test(
      error.message
    )
  ) {
    return RUNTIME_UNAVAILABLE_ERROR
  }

  return error.message
}

export async function analyzeCurrentPage(
  url: string
): Promise<AnalyzeMessageResponse> {
  try {
    const runtime = getExtensionRuntime()

    if (!runtime) {
      return {
        ok: false,
        error: RUNTIME_UNAVAILABLE_ERROR
      }
    }

    const response = (await runtime.sendMessage({
      type: "ANALYZE_CURRENT_PAGE",
      payload: {
        url,
        language: "zh-CN"
      }
    })) as AnalyzeMessageResponse | undefined

    return response ?? { ok: false, error: "扩展后台未返回分析结果" }
  } catch (error) {
    return {
      ok: false,
      error: getMessageError(error)
    } satisfies AnalyzeMessageResponse
  }
}
