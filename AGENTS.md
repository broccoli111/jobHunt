# AGENTS.md

## jobHunt — Design Systems Job Dashboard

Next.js App Router application deployed on Vercel with PostgreSQL.

## Services

| Service | Required | Command | Port |
|---------|----------|---------|------|
| Next.js dev server | Yes | `pnpm dev` | 3000 |
| PostgreSQL | Production | `DATABASE_URL` env var | — |

Without `DATABASE_URL`, uses `.data/store.json` file fallback for local dev.

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint
```

After starting dev server, click **Refresh jobs** or `POST /api/refresh` to ingest data.

## Database

Apply migration: `supabase/migrations/001_initial_schema.sql`

## Cursor Cloud specific instructions

- **First run**: Call `POST /api/refresh` to populate jobs before testing the dashboard.
- **No DATABASE_URL**: File store at `.data/store.json` is used automatically.
- **Ingestion**: Fetches from Greenhouse/Lever/Ashby APIs for companies in `src/config/companies.ts`; may take 1–3 minutes.
- **Cron**: `vercel.json` schedules refresh at `0 12 * * *` UTC (7 AM EST).
- **Images**: Clearbit logos configured in `next.config.ts` remotePatterns.
