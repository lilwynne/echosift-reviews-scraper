"use client";

import { useMemo, useState } from "react";
import type {
  AnalysisResult,
  EvidenceMap,
  ReviewEvidence
} from "@/lib/analysis-types";
import { LocaleContent } from "@/lib/mock-data";

type PriorityKanbanProps = {
  analysis: AnalysisResult;
  evidence: EvidenceMap;
  reviews: ReviewEvidence[];
  content: LocaleContent["kanban"];
  voiceLabels: LocaleContent["sentiment"]["labels"];
};

type EvidenceCard = {
  id: string;
  title: string;
  summary: string;
  count: string;
  priority: string;
  evidenceIds: string[];
};

function getReviewMeta(review: ReviewEvidence) {
  return [
    review.source,
    typeof review.rating === "number" ? `${review.rating}/5` : undefined,
    review.date,
    review.author
  ]
    .filter(Boolean)
    .join(" / ");
}

export function PriorityKanban({
  analysis,
  evidence,
  reviews,
  content,
  voiceLabels
}: PriorityKanbanProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const reviewsById = useMemo(
    () =>
      new Map(
        reviews.map((review) => [review.snippetId, review] as const)
      ),
    [reviews]
  );
  const columns = content.columns.map((column, columnIndex) => {
    if (columnIndex === 0) {
      return {
        ...column,
        cards: analysis.deepInsights.highFreqPainPoints.map((painPoint, index) => ({
          id: `pain-point-${index}`,
          title: painPoint,
          summary:
            index === 0
              ? analysis.typicalVoices.negative
              : analysis.coreMetrics.signalCluster,
          count: String(analysis.coreMetrics.highValueSignals),
          priority: index === 0 ? "P0" : "P1",
          evidenceIds: evidence.painPoints[index] ?? []
        }))
      };
    }

    if (columnIndex === 1) {
      return {
        ...column,
        cards: analysis.deepInsights.featureRequests.map((featureRequest, index) => ({
          id: `feature-request-${index}`,
          title: featureRequest,
          summary:
            index === 0
              ? analysis.typicalVoices.positive
              : analysis.coreMetrics.positiveFocus,
          count: `${analysis.coreMetrics.positiveRatio}%`,
          priority: index === 0 ? "High" : "Medium",
          evidenceIds: evidence.featureRequests[index] ?? []
        }))
      };
    }

    return {
      ...column,
      cards: [
        {
          id: "voice-positive",
          title: voiceLabels.positive,
          summary: analysis.typicalVoices.positive,
          count: voiceLabels.positive,
          priority: "Positive",
          evidenceIds: evidence.typicalVoices.positive
        },
        {
          id: "voice-neutral",
          title: voiceLabels.neutral,
          summary: analysis.typicalVoices.neutral,
          count: voiceLabels.neutral,
          priority: "Neutral",
          evidenceIds: evidence.typicalVoices.neutral
        },
        {
          id: "voice-negative",
          title: voiceLabels.negative,
          summary: analysis.typicalVoices.negative,
          count: voiceLabels.negative,
          priority: "Negative",
          evidenceIds: evidence.typicalVoices.negative
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
              {column.cards.map((card: EvidenceCard) => {
                const isExpanded = expandedCardId === card.id;
                const cardReviews = card.evidenceIds
                  .map((id) => reviewsById.get(id))
                  .filter((review): review is ReviewEvidence => Boolean(review));

                return (
                <article
                  key={card.id}
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
                      onClick={() =>
                        setExpandedCardId(isExpanded ? null : card.id)
                      }
                      aria-expanded={isExpanded}
                      className="text-xs font-semibold text-cyan-200 transition hover:text-cyan-100"
                    >
                      {content.evidence}
                    </button>
                  </div>
                  {isExpanded && cardReviews.length > 0 && (
                    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                      {cardReviews.map((review) => (
                        <figure
                          key={review.snippetId}
                          className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
                        >
                          <blockquote className="text-xs leading-6 text-slate-300">
                            &ldquo;{review.text}&rdquo;
                          </blockquote>
                          <figcaption className="mt-3 flex flex-col gap-2 text-[11px] font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>{getReviewMeta(review)}</span>
                            {review.sourceUrl && (
                              <a
                                href={review.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-200 transition hover:text-cyan-100"
                              >
                                #{review.reviewIndex}
                              </a>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
