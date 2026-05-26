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
    <div className="mt-4 w-full max-w-6xl rounded-lg border border-cyan-300/20 bg-slate-950/70 p-4 shadow-soft backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-72">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400/10">
            <div className="absolute h-11 w-11 animate-ping rounded-full bg-cyan-400/15" />
            <Loader2 className="relative h-5 w-5 animate-spin text-cyan-200" />
          </div>
          <div className="min-w-0 text-left">
            <h2 className="text-base font-semibold leading-6 text-ink">
              {content.title}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-cyan-200">
              {content.messages[activeStep]}
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          {content.messages.map((message, index) => {
            const isDone = index < activeStep;
            const isActive = index === activeStep;

            return (
              <div
                key={message}
                className={`rounded-lg border p-3 text-left transition ${
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
                <p className="text-xs font-medium leading-5 text-ink">
                  {message}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
