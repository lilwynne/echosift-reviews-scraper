import { NextResponse } from "next/server";
import { createAnalyzeJob } from "@/lib/analyze-jobs";
import {
  checkRateLimit,
  getClientIp,
  getRequestPathname
} from "@/lib/api-guards";
import { languages, type Language } from "@/lib/mock-data";

type CreateAnalyzeJobRequestBody = {
  url?: unknown;
  language?: unknown;
};

const validLanguages = new Set<Language>(
  languages.map((language) => language.code)
);

function jsonError(code: string, message: string, status: number) {
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

export async function POST(request: Request) {
  let body: CreateAnalyzeJobRequestBody;

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "请求体必须是有效的 JSON。", 400);
  }

  if (!isValidUrl(body.url)) {
    return jsonError("INVALID_URL", "请输入有效的产品链接。", 400);
  }

  if (
    typeof body.language !== "string" ||
    !validLanguages.has(body.language as Language)
  ) {
    return jsonError("INVALID_LANGUAGE", "请选择有效的返回语言。", 400);
  }

  const rateLimit = checkRateLimit({
    identifier: getClientIp(request.headers),
    pathname: getRequestPathname(request)
  });

  if (!rateLimit.allowed) {
    return jsonError("RATE_LIMITED", "请求过于频繁，请稍后再试。", 429);
  }

  return NextResponse.json(
    createAnalyzeJob({
      url: body.url,
      language: body.language as Language
    }),
    { status: 202 }
  );
}
