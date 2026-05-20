"use client";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { LocaleContent, trendData } from "@/lib/mock-data";

type SentimentChartProps = {
  content: LocaleContent["sentiment"];
};

export function SentimentChart({ content }: SentimentChartProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <article className="rounded-xl border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {content.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{content.subtitle}</p>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200">
            {content.badge}
          </span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={content.data}
                innerRadius={68}
                outerRadius={94}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {content.data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}%`, content.tooltipMetric]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: 8,
                  border: "1px solid rgba(148, 163, 184, 0.24)",
                  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.32)",
                  color: "#f8fafc"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {content.data.map((item) => (
            <div key={item.name} className="rounded-lg bg-slate-950/45 p-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-muted">
                  {item.name}
                </span>
              </div>
              <p className="mt-2 text-xl font-semibold text-ink">
                {item.value}%
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-line bg-white/10 p-5 shadow-sm backdrop-blur-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {content.trendTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {content.trendSubtitle}
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="positive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="negative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value, name) => {
                  const labelMap: Record<string, string> = {
                    positive: content.labels.positive,
                    neutral: content.labels.neutral,
                    negative: content.labels.negative
                  };
                  return [`${value}%`, labelMap[String(name)]];
                }}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: 8,
                  border: "1px solid rgba(148, 163, 184, 0.24)",
                  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.32)",
                  color: "#f8fafc"
                }}
              />
              <Area
                type="monotone"
                dataKey="positive"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#positive)"
              />
              <Area
                type="monotone"
                dataKey="neutral"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="negative"
                stroke="#f97316"
                strokeWidth={2.5}
                fill="url(#negative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
