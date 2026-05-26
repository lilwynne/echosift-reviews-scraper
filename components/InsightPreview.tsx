"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { Sparkles } from "lucide-react";
import { LocaleContent } from "@/lib/mock-data";

type InsightPreviewProps = {
  content: LocaleContent["hero"];
};

const softSpring = { type: "spring", stiffness: 60, damping: 15 } as const;
const snappySpring = {
  type: "spring",
  stiffness: 80,
  damping: 18,
  mass: 0.9
} as const;

function useCountUp(target: number, shouldAnimate: boolean) {
  const motionValue = useMotionValue(0);
  const [value, setValue] = useState(0);

  useEffect(() => {
    return motionValue.on("change", (latest) => {
      setValue(Math.round(latest));
    });
  }, [motionValue]);

  useEffect(() => {
    motionValue.stop();

    if (!shouldAnimate) {
      motionValue.set(0);
      return undefined;
    }

    motionValue.set(0);
    const controls = animate(motionValue, target, snappySpring);
    return () => controls.stop();
  }, [motionValue, shouldAnimate, target]);

  return value;
}

type PreviewReport = LocaleContent["hero"]["previewMockReport"];

function MockReportPreview({ report }: { report: PreviewReport }) {
  const [activeSourceId, setActiveSourceId] = useState(
    report.sourceTabs[0]?.id ?? ""
  );
  const activeReport =
    report.sourceReports.find((sourceReport) => sourceReport.id === activeSourceId) ??
    report.sourceReports[0];

  useEffect(() => {
    if (
      report.sourceTabs.length > 0 &&
      !report.sourceTabs.some((source) => source.id === activeSourceId)
    ) {
      setActiveSourceId(report.sourceTabs[0].id);
    }
  }, [activeSourceId, report.sourceTabs]);

  return (
    <motion.div
      key="mock-report"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={softSpring}
      className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {report.badge}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">
              {report.product}
            </h3>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-right">
            <p className="text-[11px] font-semibold text-slate-400">
              {report.timeframe}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-200">
              {report.sampleNote}
            </p>
          </div>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label={report.sourceTabLabel}
        >
          {report.sourceTabs.map((source) => {
            const isActive = source.id === activeReport.id;

            return (
              <button
                key={source.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSourceId(source.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-cyan-200/60 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                {source.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          {activeReport.summary}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {activeReport.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-white/8 bg-slate-950/45 p-3"
            >
              <p className="text-xs font-medium text-slate-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {metric.value}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {metric.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/45 p-3">
          <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-white/8">
            {activeReport.sentimentMix.map((item) => (
              <span
                key={item.label}
                className="h-full"
                style={{
                  width: `${item.value}%`,
                  backgroundColor: item.color
                }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {activeReport.sentimentMix.map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-400">{item.label}</span>
                </div>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {item.value}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <article className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {activeReport.source.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {activeReport.source.count} {report.sourceCountLabel}
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
              {activeReport.source.sentiment}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400"
              style={{ width: `${activeReport.source.value}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {activeReport.source.signal}
          </p>
        </article>

        <div className="grid gap-3 md:grid-cols-2">
          {activeReport.sections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl border border-white/10 bg-slate-950/45 p-4"
            >
              <h4 className="text-sm font-semibold text-cyan-100">
                {section.title}
              </h4>
              <div className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex gap-2 text-xs leading-5 text-slate-400">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {activeReport.reviewSnippets.map((review) => (
            <figure
              key={`${review.source}-${review.sentiment}`}
              className="rounded-lg border border-white/8 bg-white/[0.035] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  {review.source}
                </span>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                  {review.sentiment}
                </span>
              </div>
              <blockquote className="text-xs leading-5 text-slate-400">
                &ldquo;{review.quote}&rdquo;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function InsightPreview({ content }: InsightPreviewProps) {
  const metric = content.previewMetric;
  const count = useCountUp(metric.value, true);

  return (
    <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-soft"
        animate={{ scale: 1 }}
        transition={softSpring}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />

        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-200">
                {content.previewTitle}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {content.previewSubtitle}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {metric.label}
              </p>
              <div className="mt-1 flex items-baseline justify-end gap-1">
                <motion.span
                  className="text-3xl font-semibold text-ink"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={softSpring}
                >
                  {count}
                </motion.span>
                <span className="text-sm font-semibold text-emerald-200">
                  {metric.suffix}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {metric.description}
              </p>
            </div>
          </div>

          <MockReportPreview report={content.previewMockReport} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <p>{content.sourceHint}</p>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
              <span>{content.previewMockReport.readyLabel}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
