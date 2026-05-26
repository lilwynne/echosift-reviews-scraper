"use client";

import type { ReactNode } from "react";
import { ArrowRight, Link2, Sparkles } from "lucide-react";
import { LocaleContent } from "@/lib/mock-data";
import { InsightPreview } from "@/components/InsightPreview";
import { LoadingState } from "@/components/LoadingState";

type HeroAnalyzerProps = {
  productUrl: string;
  content: LocaleContent["hero"];
  loadingContent: LocaleContent["loading"];
  status: "idle" | "loading" | "result";
  loadingStep: number;
  resultContent?: ReactNode;
  onUrlChange: (value: string) => void;
  onAnalyze: () => void;
};

export function HeroAnalyzer({
  productUrl,
  content,
  loadingContent,
  status,
  loadingStep,
  resultContent,
  onUrlChange,
  onAnalyze
}: HeroAnalyzerProps) {
  const isLoading = status === "loading";
  const shouldShowPreview = status !== "result";
  const canAnalyze = !isLoading;

  return (
    <section
      id="product"
      className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
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

        <div className="mt-10 w-full max-w-6xl rounded-lg border border-cyan-300/20 bg-white/10 p-2 shadow-soft backdrop-blur-xl">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="relative flex min-h-20 flex-1 items-center">
              <Link2
                className="pointer-events-none absolute left-5 h-6 w-6 text-cyan-200/70"
                aria-hidden="true"
              />
              <input
                value={productUrl}
                onChange={(event) => onUrlChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isLoading) {
                    onAnalyze();
                  }
                }}
                placeholder={content.placeholder}
                className="h-20 w-full rounded-lg border border-transparent bg-slate-950/55 pl-16 pr-5 text-xl font-semibold text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-slate-950/75 focus:ring-4 focus:ring-cyan-400/15 sm:text-2xl"
              />
            </div>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={!canAnalyze}
              className="inline-flex h-20 items-center justify-center gap-3 rounded-lg bg-cyan-400 px-7 text-lg font-semibold text-slate-950 shadow-sm shadow-cyan-950/30 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/25 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {content.button}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isLoading && (
          <LoadingState step={loadingStep} content={loadingContent} />
        )}

        {!isLoading && status === "result" && resultContent}

        <div className="mt-5 flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
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

      {shouldShowPreview && <InsightPreview content={content} />}
    </section>
  );
}
