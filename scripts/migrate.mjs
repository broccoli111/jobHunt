#!/usr/bin/env node
/**
 * Apply db/migrations/001_initial_schema.sql to Vercel Postgres.
 *
 * Usage (after `vercel env pull` or with POSTGRES_URL in environment):
 *   pnpm db:migrate
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url =
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

if (!url) {
  console.error("Missing POSTGRES_URL. Connect Vercel Postgres, then:");
  console.error("  vercel env pull");
  console.error("  pnpm db:migrate");
  process.exit(1);
}

const sql = readFileSync(
  join(root, "db/migrations/001_initial_schema.sql"),
  "utf-8",
);

const db = postgres(url, { ssl: "require", max: 1 });

try {
  console.log("Applying migration to Vercel Postgres…");
  await db.unsafe(sql);
  console.log("Done. Tables created. Redeploy Vercel and click Refresh jobs.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await db.end();
}
