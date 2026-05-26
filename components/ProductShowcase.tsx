import { LocaleContent } from "@/lib/mock-data";

type ProductShowcaseProps = {
  content: LocaleContent["showcase"];
};

export function ProductShowcase({ content }: ProductShowcaseProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-line bg-white/10 p-6 shadow-soft backdrop-blur-xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-cyan-200">
              {content.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">
              {content.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              {content.description}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {content.stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-slate-950/45 p-4">
                <p className="text-2xl font-semibold text-ink">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            {content.platformLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {content.platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-line bg-white/10 px-3 py-1 text-sm font-semibold text-slate-200"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {content.capabilities.map((item) => (
          <article
            key={item.title}
            className="rounded-lg border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
