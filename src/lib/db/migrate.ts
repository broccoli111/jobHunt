import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";
import { resolveDatabaseUrl } from "@/lib/db/resolve-database-url";

export async function runDatabaseMigration(): Promise<{
  success: boolean;
  message: string;
}> {
  const url = resolveDatabaseUrl();

  if (!url) {
    return {
      success: false,
      message:
        "POSTGRES_URL not found. Connect Vercel Postgres to this project and redeploy.",
    };
  }

  const sql = readFileSync(
    join(process.cwd(), "db/migrations/001_initial_schema.sql"),
    "utf-8",
  );

  const db = postgres(url, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  try {
    await db.unsafe(sql);
    return {
      success: true,
      message: "Migration applied successfully. Click Refresh jobs to ingest data.",
    };
  } finally {
    await db.end();
  }
}
