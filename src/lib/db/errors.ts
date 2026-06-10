export function formatDatabaseError(error: unknown): {
  message: string;
  hint?: string;
} {
  const raw = error instanceof Error ? error.message : String(error);

  if (/relation .* does not exist/i.test(raw)) {
    return {
      message: "Database tables not found",
      hint: "In Vercel Storage → Postgres → Query, run db/migrations/001_initial_schema.sql, then redeploy.",
    };
  }

  if (/password authentication failed|connection refused|ENOTFOUND|ECONNREFUSED/i.test(raw)) {
    return {
      message: "Database connection failed",
      hint: "Connect Vercel Postgres: Storage → Create Postgres → Connect to this project.",
    };
  }

  if (/SSL|certificate/i.test(raw)) {
    return {
      message: "Database SSL connection failed",
      hint: "Ensure POSTGRES_URL is set (Vercel Storage → Postgres → Connect to project).",
    };
  }

  return {
    message: "Failed to fetch jobs",
    hint: raw,
  };
}
