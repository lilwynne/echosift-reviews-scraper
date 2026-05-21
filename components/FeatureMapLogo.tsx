import { productName } from "@/lib/mock-data";

type FeatureMapLogoProps = {
  showWordmark?: boolean;
  tagline?: string;
};

export function FeatureMapLogo({
  showWordmark = true,
  tagline
}: FeatureMapLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-slate-900 text-white shadow-sm shadow-cyan-950/40">
        <svg
          viewBox="0 0 40 40"
          className="h-8 w-8"
          aria-hidden="true"
          role="img"
        >
          <path
            d="M10 27C15.5 15.5 22.5 31 30 13"
            fill="none"
            stroke="url(#feature-map-line)"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
          <circle cx="10" cy="27" r="3.8" fill="#22d3ee" />
          <circle cx="20" cy="20" r="3.2" fill="#34d399" />
          <circle cx="30" cy="13" r="3.8" fill="#fbbf24" />
          <defs>
            <linearGradient
              id="feature-map-line"
              x1="8"
              x2="32"
              y1="28"
              y2="12"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#22d3ee" />
              <stop offset="0.55" stopColor="#34d399" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showWordmark && (
        <div>
          <p className="text-base font-semibold text-ink">
            {productName}
          </p>
          {tagline && (
            <p className="hidden text-xs text-muted sm:block">{tagline}</p>
          )}
        </div>
      )}
    </div>
  );
}
