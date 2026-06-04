"use client";

import { ChevronDown, Github, Globe2 } from "lucide-react";
import { EchoSiftLogo } from "@/components/EchoSiftLogo";
import {
  Language,
  languages,
  LocaleContent
} from "@/lib/mock-data";
import { githubRepositoryUrl } from "@/lib/links";

type HeaderProps = {
  language: Language;
  content: LocaleContent["header"];
  onLanguageChange: (language: Language) => void;
};

export function Header({
  language,
  content,
  onLanguageChange
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:h-16 md:flex-row md:items-center md:justify-between md:py-0 lg:px-8">
        <EchoSiftLogo tagline={content.tagline} />

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={githubRepositoryUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={content.githubAriaLabel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white/10 px-3 text-sm font-semibold text-ink shadow-sm transition hover:border-cyan-300/50 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            <span>{content.githubLabel}</span>
          </a>
          <label className="relative flex items-center">
            <span className="sr-only">{content.languageLabel}</span>
            <Globe2
              className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <select
              aria-label={content.languageLabel}
              value={language}
              onChange={(event) =>
                onLanguageChange(event.target.value as Language)
              }
              className="h-10 appearance-none rounded-lg border border-line bg-white/10 py-0 pl-9 pr-9 text-sm font-medium text-ink shadow-sm outline-none transition hover:border-cyan-300/50 focus:border-brand-500 focus:ring-4 focus:ring-cyan-400/15"
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
          </label>
        </div>
      </div>
    </header>
  );
}
