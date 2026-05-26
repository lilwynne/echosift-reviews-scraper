import { AudioWaveform } from "lucide-react";
import { productName } from "@/lib/mock-data";

type EchoSiftLogoProps = {
  showWordmark?: boolean;
  tagline?: string;
};

export function EchoSiftLogo({
  showWordmark = true,
  tagline
}: EchoSiftLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/25 bg-slate-950 shadow-sm shadow-cyan-950/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.44),transparent_38%),radial-gradient(circle_at_78%_80%,rgba(16,185,129,0.36),transparent_42%)]" />
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/75 text-cyan-200 ring-1 ring-white/10">
          <AudioWaveform className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
      </div>
      {showWordmark && (
        <div>
          <p className="text-base font-semibold text-ink">{productName}</p>
          {tagline && (
            <p className="hidden text-xs text-muted sm:block">{tagline}</p>
          )}
        </div>
      )}
    </div>
  );
}
