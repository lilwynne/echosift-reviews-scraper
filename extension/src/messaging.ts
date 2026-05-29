import type { AnalyzeMessageResponse } from "~src/types"

export async function analyzeCurrentPage(
  url: string
): Promise<AnalyzeMessageResponse> {
  try {
    const response = (await chrome.runtime.sendMessage({
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
      error: error instanceof Error ? error.message : "无法连接扩展后台"
    } satisfies AnalyzeMessageResponse
  }
}
