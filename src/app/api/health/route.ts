import { NextResponse } from "next/server";
import { getDatabase, isUsingFileStore } from "@/lib/db";
import {
  getDatabaseEnvStatus,
  getPostgresSetupHint,
  resolveDatabaseUrl,
} from "@/lib/db/resolve-database-url";

export async function GET() {
  const env = getDatabaseEnvStatus();
  const hasUrl = Boolean(resolveDatabaseUrl());

  let storage: "postgres" | "memory" | "file" = "memory";
  if (hasUrl) storage = "postgres";
  else if (!env.vercel && isUsingFileStore()) storage = "file";

  let dbOk = false;
  let dbError: string | undefined;

  if (hasUrl) {
    try {
      const db = getDatabase();
      await db.getCompanies();
      dbOk = true;
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    ok: hasUrl && dbOk,
    storage,
    env,
    hint: getPostgresSetupHint(),
    dbError,
    steps: [
      "Vercel → Project → Storage → Create Postgres → Connect to this project",
      "Storage → Postgres → Query → run db/migrations/001_initial_schema.sql",
      "Settings → Environment Variables → confirm POSTGRES_URL exists",
      "Deployments → Redeploy (uncheck build cache)",
      "Open site → Refresh jobs",
    ],
  });
}
