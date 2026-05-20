"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";
import { HeroAnalyzer } from "@/components/HeroAnalyzer";
import { LoadingState } from "@/components/LoadingState";
import { ProductShowcase } from "@/components/ProductShowcase";
import { UseCases } from "@/components/UseCases";
import { AuthModal } from "@/components/AuthModal";
import {
  AnalysisModel,
  Language,
  analysisModels,
  localizedContent
} from "@/lib/mock-data";

type AnalysisStatus = "idle" | "loading" | "result";
type AuthMode = "login" | "signup";

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AnalysisModel>(
    analysisModels[0].id
  );
  const [language, setLanguage] = useState<Language>("zh-CN");
  const [productUrl, setProductUrl] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const content = localizedContent[language];

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    setLoadingStep(0);
    const stepTimer = window.setInterval(() => {
      setLoadingStep((current) =>
        Math.min(current + 1, content.loading.messages.length - 1)
      );
    }, 1200);
    const finishTimer = window.setTimeout(() => {
      setStatus("result");
    }, 3800);

    return () => {
      window.clearInterval(stepTimer);
      window.clearTimeout(finishTimer);
    };
  }, [content.loading.messages.length, status]);

  const handleAnalyze = () => {
    if (!productUrl.trim()) {
      return;
    }

    setStatus("loading");
  };

  const handleReset = () => {
    setStatus("idle");
    setLoadingStep(0);
  };

  return (
    <div className="min-h-screen">
      <Header
        language={language}
        content={content.header}
        onLanguageChange={setLanguage}
        onAuthOpen={setAuthMode}
      />

      <HeroAnalyzer
        productUrl={productUrl}
        selectedModel={selectedModel}
        language={language}
        content={content.hero}
        isLoading={status === "loading"}
        onUrlChange={setProductUrl}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyze}
      />

      <ProductShowcase content={content.showcase} />
      {status === "loading" && (
        <LoadingState step={loadingStep} content={content.loading} />
      )}
      {status === "result" && (
        <Dashboard
          productUrl={productUrl}
          selectedModel={selectedModel}
          language={language}
          content={content}
          onReset={handleReset}
        />
      )}
      <UseCases content={content.useCases} />
      <AuthModal
        mode={authMode}
        content={content.auth}
        onModeChange={setAuthMode}
        onClose={() => setAuthMode(null)}
      />
    </div>
  );
}
