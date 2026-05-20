import { NextResponse } from "next/server";
import { fetchReviews } from "@/lib/apify-reviews";
import { statusFromScrapeErrorCode } from "@/lib/api-errors";

type ReviewsRequestBody = {
  url?: unknown;
};

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
  let body: ReviewsRequestBody;

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "请求体必须是有效的 JSON。", 400);
  }

  if (!isValidUrl(body.url)) {
    return jsonError("INVALID_URL", "请输入有效的产品链接。", 400);
  }

  const result = await fetchReviews(body.url);

  if (!result.ok) {
    return jsonError(
      result.error.code,
      result.error.message,
      statusFromScrapeErrorCode(result.error.code)
    );
  }

  return NextResponse.json(result);
}
