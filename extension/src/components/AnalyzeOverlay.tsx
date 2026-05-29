import { useEffect, useRef, useState } from "react"

import { analyzeCurrentPage } from "~src/messaging"
import type { AnalyzeApiResponse, AnalyzeStatus } from "~src/types"

import { AnalyzeModal } from "./AnalyzeModal"

export function AnalyzeOverlay({ currentUrl }: { currentUrl: string }) {
  const [status, setStatus] = useState<AnalyzeStatus>("idle")
  const [data, setData] = useState<AnalyzeApiResponse | null>(null)
  const [error, setError] = useState("")
  const [analyzingUrl, setAnalyzingUrl] = useState("")
  const requestIdRef = useRef(0)

  useEffect(() => {
    requestIdRef.current += 1
    setStatus("idle")
    setData(null)
    setError("")
    setAnalyzingUrl("")
  }, [currentUrl])

  function closeModal() {
    requestIdRef.current += 1
    setStatus("idle")
    setAnalyzingUrl("")
  }

  async function analyze() {
    if (status === "loading" && analyzingUrl === currentUrl) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setStatus("loading")
    setError("")
    setData(null)
    setAnalyzingUrl(currentUrl)

    const response = await analyzeCurrentPage(currentUrl)

    if (requestIdRef.current !== requestId) {
      return
    }

    if (response.ok === true) {
      setData(response.data)
      setStatus("success")
      setAnalyzingUrl("")
      return
    }

    setError(response.error)
    setStatus("error")
    setAnalyzingUrl("")
  }

  return (
    <>
      <button
        aria-label="使用 EchoSift 分析当前页面评论"
        className="fixed bottom-6 right-6 z-[2147483647] inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-echosift transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-wait disabled:opacity-80"
        disabled={status === "loading"}
        onClick={analyze}
        type="button">
        {status === "loading" ? "分析中..." : "✨ 一键分析评论"}
      </button>

      {status !== "idle" && (
        <AnalyzeModal
          data={data}
          error={error}
          onClose={closeModal}
          status={status}
        />
      )}
    </>
  )
}
