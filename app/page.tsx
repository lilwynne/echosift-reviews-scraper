"use client";

import { useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";
import { HeroAnalyzer } from "@/components/HeroAnalyzer";
import { ProductShowcase } from "@/components/ProductShowcase";
import { UseCases } from "@/components/UseCases";
import type {
  AnalyzeApiResponse,
  AnalyzeJobResponse,
  AnalyzeJobStatus
} from "@/lib/analysis-types";
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

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 80;

function getLoadingStepForJobStatus(status: AnalyzeJobStatus) {
  if (status === "analyzing") {
    return 1;
  }

  if (status === "completed") {
    return 2;
  }

  return 0;
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    value.error &&
    typeof value.error === "object" &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }

  return fallback;
}

async function readJsonResponse<T>(response: Response, fallbackError: string) {
  const json = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(json, fallbackError));
  }

  return json as T;
}

async function createAnalyzeJob(url: string, language: Language) {
  const response = await fetch("/api/analyze/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url,
      language
    })
  });

  return readJsonResponse<AnalyzeJobResponse>(response, "ANALYZE_JOB_FAILED");
}

async function fetchAnalyzeJob(jobId: string) {
  const response = await fetch(`/api/analyze/jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store"
  });

  return readJsonResponse<AnalyzeJobResponse>(response, "ANALYZE_JOB_FAILED");
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh-CN");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalyzeApiResponse | null>(
    null
  );
  const [loadingStep, setLoadingStep] = useState(0);
  const activeRunId = useRef(0);
  const content = localizedContent[language];
  const errors = errorCopy[language];
  const status = isLoading ? "loading" : analysisData ? "result" : "idle";

  useEffect(() => {
    return () => {
      activeRunId.current += 1;
    };
  }, []);

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
    setLoadingStep(0);
    activeRunId.current += 1;
    const runId = activeRunId.current;

    try {
      let job = await createAnalyzeJob(trimmedInput, language);

      if (activeRunId.current !== runId) {
        return;
      }

      setLoadingStep(getLoadingStepForJobStatus(job.status));

      for (
        let attempt = 0;
        attempt < MAX_POLL_ATTEMPTS && job.status !== "completed";
        attempt += 1
      ) {
        if (job.status === "failed") {
          throw new Error(job.error?.message ?? errors.failure);
        }

        await wait(POLL_INTERVAL_MS);
        job = await fetchAnalyzeJob(job.jobId);

        if (activeRunId.current !== runId) {
          return;
        }

        setLoadingStep(getLoadingStepForJobStatus(job.status));
      }

      if (job.status !== "completed" || !job.result) {
        throw new Error(errors.failure);
      }

      setAnalysisData(job.result);
    } catch (error) {
      if (activeRunId.current === runId) {
        setError(error instanceof Error ? error.message : errors.failure);
      }
    } finally {
      if (activeRunId.current === runId) {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    activeRunId.current += 1;
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
