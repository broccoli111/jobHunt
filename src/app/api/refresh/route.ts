import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { runIngestion } from "@/lib/ingestion/orchestrator";
import { persistIngestionResult } from "@/lib/refresh/persist-ingestion";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Dev mode without secret

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron) return true;

  const manualKey = request.headers.get("x-refresh-key");
  if (manualKey && manualKey === process.env.REFRESH_API_KEY) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ingestion = await runIngestion();
    const result = await persistIngestionResult(
      ingestion.jobs,
      ingestion.duplicatesRemoved,
      ingestion.errors,
    );

    const db = getDatabase();
    const lastRefreshed = await db.getMetadata("last_refreshed_at");

    return NextResponse.json({
      success: true,
      rawCount: ingestion.rawCount,
      deduplicatedCount: ingestion.deduplicatedCount,
      duplicatesRemoved: ingestion.duplicatesRemoved,
      ...result,
      errors: ingestion.errors,
      lastRefreshedAt: lastRefreshed,
    });
  } catch (error) {
    console.error("POST /api/refresh error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes GET
export async function GET(request: NextRequest) {
  return POST(request);
}
