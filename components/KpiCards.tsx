import { LocaleContent } from "@/lib/mock-data";

type KpiCardsProps = {
  items: LocaleContent["kpis"];
};

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-xl border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-muted">{item.label}</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <p className={`text-3xl font-semibold ${item.accent}`}>
            {item.value}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}
