import { NextRequest, NextResponse } from "next/server";
import { formatDatabaseError } from "@/lib/db/errors";
import { runDatabaseMigration } from "@/lib/db/migrate";
import { getDatabaseEnvStatus } from "@/lib/db/resolve-database-url";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const manualKey = request.headers.get("x-refresh-key");
  if (manualKey && manualKey === process.env.REFRESH_API_KEY) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDatabaseMigration();
    return NextResponse.json({
      ...result,
      env: getDatabaseEnvStatus(),
    }, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("POST /api/migrate error:", error);
    const { message, hint } = formatDatabaseError(error);
    return NextResponse.json({ success: false, error: message, hint }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
