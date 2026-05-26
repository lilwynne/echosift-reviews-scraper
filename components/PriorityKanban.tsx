import type { AnalysisResult } from "@/lib/analysis-types";
import { LocaleContent } from "@/lib/mock-data";

type PriorityKanbanProps = {
  analysis: AnalysisResult;
  content: LocaleContent["kanban"];
  voiceLabels: LocaleContent["sentiment"]["labels"];
};

export function PriorityKanban({
  analysis,
  content,
  voiceLabels
}: PriorityKanbanProps) {
  const columns = content.columns.map((column, columnIndex) => {
    if (columnIndex === 0) {
      return {
        ...column,
        cards: analysis.deepInsights.highFreqPainPoints.map((painPoint, index) => ({
          title: painPoint,
          summary:
            index === 0
              ? analysis.typicalVoices.negative
              : analysis.coreMetrics.signalCluster,
          count: String(analysis.coreMetrics.highValueSignals),
          priority: index === 0 ? "P0" : "P1"
        }))
      };
    }

    if (columnIndex === 1) {
      return {
        ...column,
        cards: analysis.deepInsights.featureRequests.map((featureRequest, index) => ({
          title: featureRequest,
          summary:
            index === 0
              ? analysis.typicalVoices.positive
              : analysis.coreMetrics.positiveFocus,
          count: `${analysis.coreMetrics.positiveRatio}%`,
          priority: index === 0 ? "High" : "Medium"
        }))
      };
    }

    return {
      ...column,
      cards: [
        {
          title: voiceLabels.positive,
          summary: analysis.typicalVoices.positive,
          count: voiceLabels.positive,
          priority: "Positive"
        },
        {
          title: voiceLabels.neutral,
          summary: analysis.typicalVoices.neutral,
          count: voiceLabels.neutral,
          priority: "Neutral"
        },
        {
          title: voiceLabels.negative,
          summary: analysis.typicalVoices.negative,
          count: voiceLabels.negative,
          priority: "Negative"
        }
      ]
    };
  });

  return (
    <section className="rounded-xl border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {content.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {content.description}
          </p>
        </div>
        <span className="rounded-full border border-line bg-white/10 px-3 py-1 text-sm font-medium text-muted">
          {analysis.coreMetrics.signalCluster}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.title}
            className={`rounded-xl border p-4 ${column.tone}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200 shadow-sm">
                  <column.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="truncate text-sm font-semibold text-ink">
                  {column.title}
                </h3>
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 shadow-sm">
                {column.cards.length}
              </span>
            </div>

            <div className="space-y-3">
              {column.cards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-lg border border-white/10 bg-slate-950/50 p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold leading-6 text-ink">
                      {card.title}
                    </h4>
                    <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">
                      {card.priority}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-muted">{card.summary}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-xs font-semibold text-slate-400">
                      {card.count}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-cyan-200 transition hover:text-cyan-100"
                    >
                      {content.evidence}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
