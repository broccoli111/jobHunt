export function formatDatabaseError(error: unknown): {
  message: string;
  hint?: string;
} {
  const raw = error instanceof Error ? error.message : String(error);

  if (/relation .* does not exist/i.test(raw)) {
    return {
      message: "Database tables not found",
      hint: "Run supabase/migrations/001_initial_schema.sql on your Postgres database, then redeploy.",
    };
  }

  if (/password authentication failed|connection refused|ENOTFOUND|ECONNREFUSED/i.test(raw)) {
    return {
      message: "Database connection failed",
      hint: "Check DATABASE_URL or POSTGRES_URL in Vercel environment variables.",
    };
  }

  if (/SSL|certificate/i.test(raw)) {
    return {
      message: "Database SSL connection failed",
      hint: "Ensure your connection string supports SSL (required on Vercel Postgres and Supabase).",
    };
  }

  return {
    message: "Failed to fetch jobs",
    hint: raw,
  };
}
