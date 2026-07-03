import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEEPALIVE_KEY = "echosift:redis:keepalive";
const KEEPALIVE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type KeepalivePayload = {
  checkedAt: string;
  service: "echosift";
  source: "vercel-cron";
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

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  return url && token ? { url, token } : undefined;
}

function getCronSecret() {
  return process.env.CRON_SECRET?.trim();
}

function isAuthorized(request: Request, cronSecret: string) {
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret();

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return jsonError(
        "CRON_SECRET_NOT_CONFIGURED",
        "生产环境缺少 CRON_SECRET，无法安全执行定时任务。",
        503
      );
    }
  } else if (!isAuthorized(request, cronSecret)) {
    return jsonError("UNAUTHORIZED", "未授权的定时任务请求。", 401);
  }

  const redisConfig = getRedisConfig();

  if (!redisConfig) {
    return jsonError(
      "REDIS_NOT_CONFIGURED",
      "缺少 Upstash Redis REST 配置。",
      503
    );
  }

  const redis = new Redis(redisConfig);
  const payload: KeepalivePayload = {
    checkedAt: new Date().toISOString(),
    service: "echosift",
    source: "vercel-cron"
  };

  try {
    await redis.set(KEEPALIVE_KEY, payload, {
      px: KEEPALIVE_TTL_MS
    });

    const stored = await redis.get<KeepalivePayload>(KEEPALIVE_KEY);

    if (!stored?.checkedAt) {
      return jsonError(
        "REDIS_KEEPALIVE_VERIFY_FAILED",
        "Redis 保活写入后读取校验失败。",
        502
      );
    }

    return NextResponse.json({
      ok: true,
      checkedAt: payload.checkedAt,
      key: KEEPALIVE_KEY,
      ttlMs: KEEPALIVE_TTL_MS
    });
  } catch (error) {
    console.error("[REDIS_KEEPALIVE_FAILED]", {
      error
    });

    return jsonError(
      "REDIS_KEEPALIVE_FAILED",
      "Redis 保活请求失败，请检查 Upstash REST URL 和 Token。",
      502
    );
  }
}
