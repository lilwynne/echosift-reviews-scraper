import { useEffect, useRef, useState } from "react"

import { analyzeCurrentPage } from "~src/messaging"
import type { AnalyzeApiResponse, AnalyzeStatus } from "~src/types"

import { AnalyzeModal } from "./AnalyzeModal"

function EchoSiftMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl",
        "border border-cyan-300/25 bg-slate-950 shadow-sm shadow-cyan-950/40",
        className
      ].join(" ")}>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.44),transparent_38%),radial-gradient(circle_at_78%_80%,rgba(16,185,129,0.36),transparent_42%)]" />
      <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950/75 text-cyan-200 ring-1 ring-white/10">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 12c2 0 2-5 4-5s2 10 4 10 2-12 4-12 2 7 4 7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
          <path
            d="M4 12c2 0 2 4 4 4s2-6 4-6 2 5 4 5 2-3 4-3"
            stroke="#10b981"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      </span>
    </span>
  )
}

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
        className="fixed bottom-6 right-6 z-[2147483647] inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-cyan-300/25 bg-slate-950/90 px-3 py-2 pr-5 text-sm font-semibold text-ink shadow-echosift backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:bg-slate-900/95 hover:text-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-400/25 disabled:cursor-wait disabled:translate-y-0 disabled:border-slate-600/50 disabled:text-slate-400"
        disabled={status === "loading"}
        onClick={analyze}
        type="button">
        <EchoSiftMark />
        <span>{status === "loading" ? "分析中..." : "一键分析评论"}</span>
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
