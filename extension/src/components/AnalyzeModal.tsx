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

export function AnalyzeModal({
  status,
  data,
  error,
  onClose
}: AnalyzeModalProps) {
  const analysis = data?.analysis

  return (
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-slate-950/55 p-4 text-slate-950">
      <section
        aria-live="polite"
        className="max-h-[86vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-2xl"
        role="dialog">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              EchoSift
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              评论分析报告
            </h2>
          </div>

          <button
            className="rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={onClose}
            type="button">
            关闭
          </button>
        </div>

        {status === "loading" && (
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-sm text-slate-700">
            <div className="mb-3 h-2 w-28 overflow-hidden rounded-full bg-cyan-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-500" />
            </div>
            首次分析可能需要几十秒；同一页面会复用结果。
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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

            <section className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">情绪概览</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["positive", "neutral", "negative"] as const).map(
                  (sentiment) => (
                    <div
                      className="rounded-md bg-slate-50 p-3 text-center"
                      key={sentiment}>
                      <div className="text-xs text-slate-500">
                        {sentimentLabels[sentiment]}
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-950">
                        {analysis.emotionDistribution[sentiment]}%
                      </div>
                    </div>
                  )
                )}
              </div>
              {analysis.insightPreview.coreSummary && (
                <p className="mt-3 leading-6 text-slate-700">
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
    <div className="rounded-lg bg-slate-100 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={[
          "mt-1 leading-6 text-slate-900",
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
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="mb-3 font-semibold text-slate-950">{title}</h3>
      {visibleItems.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 leading-6 text-slate-700">
          {visibleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-500">暂无相关结果。</p>
      )}
    </section>
  )
}
