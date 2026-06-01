import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";
import {
  getQStashSignatureConfig,
  runQueuedAnalyzeJob
} from "@/lib/analyze-jobs";

type RunAnalyzeJobRequestBody = {
  jobId?: unknown;
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

function hasSigningConfig() {
  const config = getQStashSignatureConfig();

  return Boolean(config.currentSigningKey && config.nextSigningKey && config.url);
}

async function runAnalyzeJobHandler(request: Request) {
  if (process.env.NODE_ENV === "production" && !hasSigningConfig()) {
    return jsonError(
      "ANALYSIS_QUEUE_NOT_CONFIGURED",
      "生产环境缺少 QStash 签名配置。",
      503
    );
  }

  let body: RunAnalyzeJobRequestBody;

  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "请求体必须是有效的 JSON。", 400);
  }

  if (typeof body.jobId !== "string" || !body.jobId.trim()) {
    return jsonError("INVALID_JOB_ID", "分析任务 ID 无效。", 400);
  }

  await runQueuedAnalyzeJob(body.jobId.trim());

  return NextResponse.json({
    ok: true
  });
}

export const POST = hasSigningConfig()
  ? verifySignatureAppRouter(runAnalyzeJobHandler, getQStashSignatureConfig())
  : runAnalyzeJobHandler;
