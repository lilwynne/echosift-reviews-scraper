"use client";

import { X } from "lucide-react";
import { LocaleContent } from "@/lib/mock-data";

type AuthMode = "login" | "signup";

type AuthModalProps = {
  mode: AuthMode | null;
  content: LocaleContent["auth"];
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
};

export function AuthModal({
  mode,
  content,
  onModeChange,
  onClose
}: AuthModalProps) {
  if (!mode) {
    return null;
  }

  const isLogin = mode === "login";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-line bg-slate-950/95 p-6 shadow-soft">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              {isLogin ? content.loginTitle : content.signupTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {content.helper}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-slate-400 transition hover:bg-white/10 hover:text-ink"
            aria-label={content.closeLabel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              {content.emailLabel}
            </span>
            <input
              type="email"
              placeholder={content.emailPlaceholder}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white/10 px-3 text-sm text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-400/15"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              {content.passwordLabel}
            </span>
            <input
              type="password"
              placeholder={content.passwordPlaceholder}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white/10 px-3 text-sm text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-400/15"
            />
          </label>
          <button
            type="button"
            className="h-11 w-full rounded-lg bg-cyan-400 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/25"
          >
            {isLogin ? content.loginButton : content.signupButton}
          </button>
        </form>

        <button
          type="button"
          onClick={() => onModeChange(isLogin ? "signup" : "login")}
          className="mt-4 w-full text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
        >
          {isLogin ? content.switchToSignup : content.switchToLogin}
        </button>
      </div>
    </div>
  );
}
