import { LocaleContent } from "@/lib/mock-data";
import { KpiCards } from "@/components/KpiCards";
import { PriorityKanban } from "@/components/PriorityKanban";
import { SentimentChart } from "@/components/SentimentChart";
import type { AnalyzeApiResponse } from "@/lib/analysis-types";
import type { Language } from "@/lib/mock-data";

type DashboardProps = {
  analysisData: AnalyzeApiResponse;
  content: LocaleContent;
  language: Language;
  onReset: () => void;
};

const reviewCountLabel: Record<Language, string> = {
  "zh-CN": "条评价",
  "zh-TW": "則評價",
  en: "reviews"
};

export function Dashboard({
  analysisData,
  content,
  language,
  onReset
}: DashboardProps) {
  const { analysis } = analysisData;

  return (
    <section
      id="dashboard"
      className="mt-4 w-full max-w-6xl text-left"
    >
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-xl border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-cyan-200">
            {content.dashboard.complete}
          </p>
          <h2 className="mt-1 truncate text-2xl font-semibold text-ink">
            {content.dashboard.title}
          </h2>
          <p className="mt-2 truncate text-sm text-muted">
            {content.dashboard.sourceLabel}：
            {analysisData.sourceUrl} · {analysisData.scrapeSource} ·{" "}
            {analysisData.reviewCount} {reviewCountLabel[language]} ·{" "}
            {content.dashboard.modeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white/10 px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-cyan-300/50 hover:bg-white/15"
        >
          {content.dashboard.reset}
        </button>
      </div>

      <div className="space-y-4">
        <KpiCards analysis={analysis} content={content} />
        <SentimentChart
          analysis={analysis}
          content={content.sentiment}
          language={language}
        />
        <PriorityKanban
          analysis={analysis}
          content={content.kanban}
          voiceLabels={content.sentiment.labels}
        />
      </div>
    </section>
  );
}
