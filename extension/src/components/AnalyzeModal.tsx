import type { AnalyzeApiResponse, AnalyzeStatus } from "~src/types"

type AnalyzeModalProps = {
  status: Exclude<AnalyzeStatus, "idle">
  data: AnalyzeApiResponse | null
  error: string
  onClose: () => void
}

const sentimentLabels = {
  positive: "正向",
  neutral: "中性",
  negative: "负向"
}

const sentimentStyles = {
  positive: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  neutral: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
  negative: "border-rose-300/20 bg-rose-400/10 text-rose-200"
}

export function AnalyzeModal({
  status,
  data,
  error,
  onClose
}: AnalyzeModalProps) {
  const analysis = data?.analysis

  return (
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-slate-950/80 p-4 text-ink backdrop-blur-sm">
      <section
        aria-modal="true"
        aria-live="polite"
        className="relative max-h-[86vh] w-full max-w-2xl overflow-auto rounded-lg border border-cyan-300/20 bg-slate-950/95 p-6 shadow-soft"
        role="dialog">
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-[radial-gradient(circle_at_18%_8%,rgba(6,182,212,0.18),transparent_18rem),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.13),transparent_18rem)]" />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                EchoSift
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                评论分析报告
              </h2>
            </div>

            <button
              className="rounded-md border border-white/10 px-2 py-1 text-sm text-muted transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              onClick={onClose}
              type="button">
              关闭
            </button>
          </div>

          {status === "loading" && (
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-slate-300">
              <div className="mb-3 h-2 w-28 overflow-hidden rounded-full bg-cyan-300/15">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-500" />
              </div>
              首次分析可能需要几十秒；同一页面会复用结果。
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-200">
              {error || "分析失败，请稍后重试。"}
            </div>
          )}

          {status === "success" && data && analysis && (
            <div className="space-y-5 text-sm">
              <Info label="产品来源 URL" value={data.sourceUrl} breakAll />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="评论数量" value={String(data.reviewCount)} />
                <Info label="数据源类型" value={data.scrapeSource} />
              </div>

              <section className="rounded-lg border border-line bg-white/[0.03] p-4">
                <h3 className="font-semibold text-ink">情绪概览</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["positive", "neutral", "negative"] as const).map(
                    (sentiment) => (
                      <div
                        className={[
                          "rounded-md border p-3 text-center",
                          sentimentStyles[sentiment]
                        ].join(" ")}
                        key={sentiment}>
                        <div className="text-xs text-slate-400">
                          {sentimentLabels[sentiment]}
                        </div>
                        <div className="mt-1 text-base font-semibold">
                          {analysis.emotionDistribution[sentiment]}%
                        </div>
                      </div>
                    )
                  )}
                </div>
                {analysis.insightPreview.coreSummary && (
                  <p className="mt-3 leading-6 text-slate-300">
                    {analysis.insightPreview.coreSummary}
                  </p>
                )}
              </section>

              <List
                items={analysis.deepInsights.highFreqPainPoints}
                title="高频痛点"
              />
              <List
                items={analysis.deepInsights.featureRequests}
                title="功能请求"
              />
              <List
                items={[
                  analysis.typicalVoices.positive,
                  analysis.typicalVoices.neutral,
                  analysis.typicalVoices.negative
                ]}
                title="典型用户声音"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Info({
  label,
  value,
  breakAll = false
}: {
  label: string
  value: string
  breakAll?: boolean
}) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.04] p-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div
        className={[
          "mt-1 leading-6 text-slate-100",
          breakAll ? "break-all" : ""
        ].join(" ")}>
        {value}
      </div>
    </div>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.filter(Boolean)

  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <h3 className="mb-3 font-semibold text-ink">{title}</h3>
      {visibleItems.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 leading-6 text-slate-300 marker:text-cyan-300">
          {visibleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">暂无相关结果。</p>
      )}
    </section>
  )
}
