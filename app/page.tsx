"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";
import { HeroAnalyzer } from "@/components/HeroAnalyzer";
import { ProductShowcase } from "@/components/ProductShowcase";
import { UseCases } from "@/components/UseCases";
import type { AnalyzeApiResponse } from "@/lib/analysis-types";
import { Language, localizedContent } from "@/lib/mock-data";

const errorCopy: Record<
  Language,
  {
    emptyInput: string;
    failure: string;
  }
> = {
  "zh-CN": {
    emptyInput: "请输入 Product Hunt、App Store 或 Google Play 产品链接。",
    failure: "分析失败，请重试"
  },
  "zh-TW": {
    emptyInput: "請輸入 Product Hunt、App Store 或 Google Play 產品連結。",
    failure: "分析失敗，請重試"
  },
  en: {
    emptyInput: "Enter a Product Hunt, App Store, or Google Play product link.",
    failure: "Analysis failed. Please retry."
  }
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh-CN");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeApiResponse | null>(
    null
  );
  const [loadingStep, setLoadingStep] = useState(0);
  const content = localizedContent[language];
  const errors = errorCopy[language];
  const status = isLoading ? "loading" : analysisData ? "result" : "idle";

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    setLoadingStep(0);
    const stepTimer = window.setInterval(() => {
      setLoadingStep((current) =>
        Math.min(current + 1, content.loading.messages.length - 1)
      );
    }, 1200);

    return () => {
      window.clearInterval(stepTimer);
    };
  }, [content.loading.messages.length, isLoading]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const toastTimer = window.setTimeout(() => {
      setError(null);
    }, 3600);

    return () => {
      window.clearTimeout(toastTimer);
    };
  }, [error]);

  const handleAnalyze = async () => {
    const trimmedInput = inputText.trim();

    if (!trimmedInput) {
      setError(errors.emptyInput);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: trimmedInput,
          language
        })
      });

      const data = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok) {
        throw new Error("ANALYSIS_FAILED");
      }

      setAnalysisData(data);
    } catch {
      setError(errors.failure);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setIsLoading(false);
    setAnalysisData(null);
    setLoadingStep(0);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        language={language}
        content={content.header}
        onLanguageChange={setLanguage}
      />

      <HeroAnalyzer
        productUrl={inputText}
        content={content.hero}
        loadingContent={content.loading}
        status={status}
        loadingStep={loadingStep}
        resultContent={
          analysisData && !isLoading ? (
            <Dashboard
              analysisData={analysisData}
              content={content}
              language={language}
              onReset={handleReset}
            />
          ) : undefined
        }
        onUrlChange={handleInputChange}
        onAnalyze={handleAnalyze}
      />

      <ProductShowcase content={content.showcase} />
      {error && (
        <div
          role="alert"
          className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-xs rounded-lg border border-orange-300/30 bg-slate-950/95 px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:right-6 sm:top-6"
        >
          <p className="text-sm font-semibold leading-6 text-orange-100">
            {error}
          </p>
        </div>
      )}
      <UseCases content={content.useCases} />
    </div>
  );
}
