import { ExternalLink, Github } from "lucide-react";
import { githubRepositoryUrl } from "@/lib/links";
import type { LocaleContent } from "@/lib/mock-data";

type AppFooterProps = {
  content: LocaleContent["footer"];
};

export function AppFooter({ content }: AppFooterProps) {
  return (
    <footer className="border-t border-line/80 bg-slate-950/45">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-300">EchoSift</p>
        <a
          href={githubRepositoryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={content.githubAriaLabel}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-white/10 px-3 py-2 text-sm font-semibold text-ink transition hover:border-cyan-300/50 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
        >
          <Github className="h-4 w-4 text-cyan-200" aria-hidden="true" />
          <span>{content.githubLabel}</span>
          <span className="hidden text-slate-400 sm:inline">
            {content.githubRepo}
          </span>
          <ExternalLink
            className="h-3.5 w-3.5 text-slate-400"
            aria-hidden="true"
          />
        </a>
      </div>
    </footer>
  );
}
