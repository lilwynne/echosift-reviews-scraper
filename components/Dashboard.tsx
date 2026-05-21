import {
  AnalysisModel,
  Language,
  LocaleContent,
  getModelLabel
} from "@/lib/mock-data";
import { KpiCards } from "@/components/KpiCards";
import { PriorityKanban } from "@/components/PriorityKanban";
import { SentimentChart } from "@/components/SentimentChart";

type DashboardProps = {
  productUrl: string;
  selectedModel: AnalysisModel;
  language: Language;
  content: LocaleContent;
  onReset: () => void;
};

export function Dashboard({
  productUrl,
  selectedModel,
  language,
  content,
  onReset
}: DashboardProps) {
  return (
    <main
      id="dashboard"
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
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
            {productUrl || "https://www.producthunt.com/products/feedbackai"} ·{" "}
            {content.dashboard.modelLabel}：{getModelLabel(selectedModel, language)}
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
        <KpiCards items={content.kpis} />
        <SentimentChart content={content.sentiment} />
        <PriorityKanban content={content.kanban} />
      </div>
    </main>
  );
}
