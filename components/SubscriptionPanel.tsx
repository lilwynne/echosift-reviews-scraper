"use client";

import { Check, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { LocaleContent } from "@/lib/mock-data";

type SubscriptionPanelProps = {
  content: LocaleContent["subscription"];
};

export function SubscriptionPanel({ content }: SubscriptionPanelProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setIsSubscribed(true);
  };

  return (
    <section
      id="subscribe"
      className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
    >
      <div className="grid gap-6 rounded-xl border border-line bg-ink p-6 text-white shadow-soft md:grid-cols-[1fr_0.9fr] md:items-center md:p-8">
        <div>
          <p className="text-sm font-semibold text-cyan-200">
            {content.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {content.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {content.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {content.benefits.map((benefit) => (
              <span
                key={benefit}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-slate-100"
              >
                <Check className="h-3.5 w-3.5 text-cyan-300" />
                {benefit}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex min-h-12 flex-1 items-center">
              <Mail
                className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setIsSubscribed(false);
                }}
                placeholder={content.placeholder}
                className="h-12 w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </div>
            <button
              type="submit"
              disabled={!email.trim()}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-cyan-600 px-5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {content.button}
            </button>
          </div>
          <p className="px-2 pt-3 text-xs leading-5 text-slate-500">
            {isSubscribed ? content.success : content.privacy}
          </p>
        </form>
      </div>
    </section>
  );
}
