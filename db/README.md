# Database (Vercel Postgres)

jobHunt uses **Vercel Postgres** in production. No Supabase or third-party database services are required.

## Setup

1. Vercel project → **Storage** → **Create Database** → **Postgres**
2. **Connect** the database to your project (auto-injects `POSTGRES_URL`)
3. Open the database → **Query** tab
4. Paste and run `db/migrations/001_initial_schema.sql`
5. **Redeploy** your Vercel project
6. Click **Refresh jobs** on the dashboard

## Local development

Without `POSTGRES_URL`, `pnpm dev` uses a local file store (`.data/store.json`). For local Postgres testing, copy `POSTGRES_URL` from Vercel → Storage → `.env.local`.
