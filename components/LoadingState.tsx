"use client";

import { Loader2 } from "lucide-react";
import { LocaleContent } from "@/lib/mock-data";

type LoadingStateProps = {
  step: number;
  content: LocaleContent["loading"];
};

export function LoadingState({ step, content }: LoadingStateProps) {
  const activeStep = Math.min(step, content.messages.length - 1);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-line bg-white/10 p-6 shadow-soft backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10">
            <div className="absolute h-16 w-16 animate-ping rounded-full bg-cyan-400/15" />
            <Loader2 className="relative h-8 w-8 animate-spin text-cyan-200" />
          </div>
          <h2 className="text-xl font-semibold text-ink">{content.title}</h2>
          <p className="mt-2 min-h-6 text-sm font-medium text-cyan-200">
            {content.messages[activeStep]}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {content.messages.map((message, index) => {
            const isDone = index < activeStep;
            const isActive = index === activeStep;

            return (
              <div
                key={message}
                className={`rounded-lg border p-4 transition ${
                  isActive
                    ? "border-cyan-300/30 bg-cyan-400/10"
                    : isDone
                      ? "border-emerald-300/25 bg-emerald-400/10"
                      : "border-line bg-slate-950/45"
                }`}
              >
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isDone
                          ? "w-full bg-emerald-400"
                        : isActive
                          ? "w-2/3 bg-cyan-400"
                          : "w-0 bg-slate-300"
                    }`}
                  />
                </div>
                <p className="text-sm font-medium text-ink">{message}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
