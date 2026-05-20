import { NextResponse } from "next/server";
import {
  AnalysisModel,
  Language,
  analysisModels,
  languages,
  localizedContent,
  trendData
} from "@/lib/mock-data";
import { fetchReviews } from "@/lib/apify-reviews";
import { statusFromScrapeErrorCode } from "@/lib/api-errors";

type AnalyzeRequestBody = {
  url?: unknown;
  model?: unknown;
  language?: unknown;
};

type SerializableIcon = {
  displayName?: string;
  name?: string;
};

const validModels = new Set<AnalysisModel>(
  analysisModels.map((model) => model.id)
);
const validLanguages = new Set<Language>(
  languages.map((language) => language.code)
);

function jsonError(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error: {
        code,
        message
      }
    },
    { status }
  );
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function serializeIcon(icon: SerializableIcon) {
  const iconName = icon.displayName ?? icon.name ?? "MessageSquare";
  return iconName === "TriangleAlert" ? "AlertTriangle" : iconName;
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "请求体必须是有效的 JSON。", 400);
  }

  if (!isValidUrl(body.url)) {
    return jsonError("INVALID_URL", "请输入有效的产品链接。", 400);
  }

  if (typeof body.model !== "string" || !validModels.has(body.model as AnalysisModel)) {
    return jsonError("INVALID_MODEL", "请选择有效的分析模型。", 400);
  }

  if (
    typeof body.language !== "string" ||
    !validLanguages.has(body.language as Language)
  ) {
    return jsonError("INVALID_LANGUAGE", "请选择有效的返回语言。", 400);
  }

  const model = body.model as AnalysisModel;
  const language = body.language as Language;
  const content = localizedContent[language];
  const scrapeResult = await fetchReviews(body.url);

  if (!scrapeResult.ok) {
    return jsonError(
      scrapeResult.error.code,
      scrapeResult.error.message,
      statusFromScrapeErrorCode(scrapeResult.error.code)
    );
  }

  return NextResponse.json({
    sourceUrl: body.url,
    model,
    language,
    scrapeSource: scrapeResult.source,
    reviewCount: scrapeResult.count,
    reviews: scrapeResult.reviews,
    dashboard: content.dashboard,
    kpis: content.kpis.map((item) => ({
      label: item.label,
      value: item.value,
      detail: item.detail,
      accent: item.accent,
      icon: serializeIcon(item.icon)
    })),
    sentiment: content.sentiment,
    trendData,
    kanban: {
      title: content.kanban.title,
      description: content.kanban.description,
      clustered: content.kanban.clustered,
      evidence: content.kanban.evidence,
      columns: content.kanban.columns.map((column) => ({
        title: column.title,
        tone: column.tone,
        icon: serializeIcon(column.icon),
        cards: column.cards
      }))
    }
  });
}
