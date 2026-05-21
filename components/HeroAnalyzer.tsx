"use client";

import { ArrowRight, ChevronDown, Link2, Sparkles } from "lucide-react";
import {
  AnalysisModel,
  LocaleContent,
  Language,
  analysisModels,
  getModelLabel
} from "@/lib/mock-data";

type HeroAnalyzerProps = {
  productUrl: string;
  selectedModel: AnalysisModel;
  language: Language;
  content: LocaleContent["hero"];
  isLoading: boolean;
  onUrlChange: (value: string) => void;
  onModelChange: (model: AnalysisModel) => void;
  onAnalyze: () => void;
};

export function HeroAnalyzer({
  productUrl,
  selectedModel,
  language,
  content,
  isLoading,
  onUrlChange,
  onModelChange,
  onAnalyze
}: HeroAnalyzerProps) {
  const canAnalyze = productUrl.trim().length > 0 && !isLoading;

  return (
    <section
      id="product"
      className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {content.badge}
        </div>
        <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.2] text-ink sm:text-6xl sm:leading-[1.16]">
          {content.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
          {content.description}
        </p>

        <div className="mt-10 w-full max-w-6xl rounded-2xl border border-cyan-300/20 bg-white/10 p-2 shadow-soft backdrop-blur-xl">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_16rem_13rem]">
            <div className="relative flex min-h-20 flex-1 items-center">
              <Link2
                className="pointer-events-none absolute left-5 h-6 w-6 text-cyan-200/70"
                aria-hidden="true"
              />
              <input
                value={productUrl}
                onChange={(event) => onUrlChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAnalyze) {
                    onAnalyze();
                  }
                }}
                placeholder={content.placeholder}
                className="h-20 w-full rounded-xl border border-transparent bg-slate-950/55 pl-16 pr-5 text-xl font-semibold text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-slate-950/75 focus:ring-4 focus:ring-cyan-400/15 sm:text-2xl"
              />
            </div>
            <label className="relative flex items-center">
              <span className="sr-only">{content.modelLabel}</span>
              <select
                aria-label={content.modelLabel}
                value={selectedModel}
                onChange={(event) =>
                  onModelChange(event.target.value as AnalysisModel)
                }
                className="h-20 w-full appearance-none rounded-xl border border-line bg-slate-950/45 py-0 pl-5 pr-11 text-lg font-semibold text-ink outline-none transition hover:border-cyan-300/50 focus:border-brand-500 focus:ring-4 focus:ring-cyan-400/15"
              >
                {analysisModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.labels[language]}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
            </label>
            {!isLoading && (
              <button
                type="button"
                onClick={onAnalyze}
                disabled={!canAnalyze}
                className="inline-flex h-20 items-center justify-center gap-3 rounded-xl bg-cyan-400 px-7 text-lg font-semibold text-slate-950 shadow-sm shadow-cyan-950/30 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/25 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {content.button}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
          <p className="leading-7">
            {content.currentModel}
            <span className="font-medium text-ink">
              {getModelLabel(selectedModel, language)}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {content.chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/10 px-3 py-1 font-medium text-slate-300"
              >
                <chip.icon className="h-3.5 w-3.5 text-cyan-600" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl rounded-2xl border border-line bg-white/10 p-4 shadow-soft backdrop-blur-xl">
        <div className="rounded-xl border border-cyan-300/15 bg-slate-950/80 p-5 text-white">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-200">
                {content.previewTitle}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {content.previewSubtitle}
              </p>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">
              62%
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {content.chips.map((chip, index) => (
              <div
                key={chip.label}
                className="rounded-lg border border-white/10 bg-white/[0.07] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <chip.icon className="h-4 w-4 text-cyan-300" />
                    <p className="text-sm font-semibold">{chip.label}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {index === 0 ? "P0" : index === 1 ? "P1" : "P2"}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{ width: `${72 - index * 16}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">{content.sourceHint}</p>
        </div>
      </div>
    </section>
  );
}
