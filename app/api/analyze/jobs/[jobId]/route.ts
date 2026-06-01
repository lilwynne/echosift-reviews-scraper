import { NextResponse } from "next/server";
import { getAnalyzeJob } from "@/lib/analyze-jobs";

type RouteContext = {
  params: {
    jobId?: string;
  };
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

export async function GET(_request: Request, { params }: RouteContext) {
  const jobId = params.jobId?.trim();

  if (!jobId) {
    return jsonError("INVALID_JOB_ID", "分析任务 ID 无效。", 400);
  }

  const job = await getAnalyzeJob(jobId);

  if (!job) {
    return jsonError("ANALYZE_JOB_NOT_FOUND", "分析任务不存在或已过期。", 404);
  }

  return NextResponse.json(job);
}
