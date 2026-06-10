/**
 * Resolve Postgres connection string from Vercel Postgres env vars.
 * Vercel injects POSTGRES_URL when you connect Storage → Postgres to your project.
 */
export function resolveDatabaseUrl(): string | undefined {
  if (process.env.VERCEL) {
    return (
      process.env.POSTGRES_URL ??
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL
    );
  }

  // Local dev: optional POSTGRES_URL from Vercel CLI / .env.local
  return (
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL
  );
}
