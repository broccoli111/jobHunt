/**
 * Resolve Postgres connection string from Vercel Postgres env vars.
 * Vercel injects these when you connect Storage → Postgres to your project.
 * You must redeploy after connecting Storage for vars to reach serverless functions.
 */
export function resolveDatabaseUrl(): string | undefined {
  const fromUrl =
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL;

  if (fromUrl) return fromUrl;

  // Fallback: build from discrete Vercel Postgres vars
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE;
  const port = process.env.POSTGRES_PORT ?? "5432";

  if (host && user && password && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=require`;
  }

  return undefined;
}

/** Safe diagnostics — never exposes secret values */
export function getDatabaseEnvStatus() {
  return {
    vercel: Boolean(process.env.VERCEL),
    hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
    hasPostgresPrismaUrl: Boolean(process.env.POSTGRES_PRISMA_URL),
    hasPostgresNonPooling: Boolean(process.env.POSTGRES_URL_NON_POOLING),
    hasPostgresHost: Boolean(process.env.POSTGRES_HOST),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    resolved: Boolean(resolveDatabaseUrl()),
  };
}

export function getPostgresSetupHint(): string {
  const status = getDatabaseEnvStatus();
  if (status.resolved) {
    return "Postgres env detected. If jobs fail, run db/migrations/001_initial_schema.sql in Storage → Query.";
  }
  if (status.vercel && !status.hasPostgresUrl && !status.hasPostgresHost) {
    return "POSTGRES_URL not found. Connect Vercel Postgres to this project, then redeploy (required for env vars to load).";
  }
  return "Connect Vercel Postgres via Storage, run db/migrations/001_initial_schema.sql, redeploy, then Refresh jobs.";
}
