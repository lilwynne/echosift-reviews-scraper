import { LocaleContent } from "@/lib/mock-data";

type UseCasesProps = {
  content: LocaleContent["useCases"];
};

export function UseCases({ content }: UseCasesProps) {
  return (
    <section
      id="use-cases"
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mb-6 max-w-3xl">
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

      <div className="grid gap-4 md:grid-cols-3">
        {content.personas.map((persona) => (
          <article
            key={persona.role}
            className="rounded-xl border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                {persona.role}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
                <persona.icon className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-ink">
              {persona.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              {persona.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
