# AGENTS.md

## jobHunt — Design Systems Job Dashboard

Next.js on **Vercel** with **Vercel Postgres**. No Supabase.

**Repository:** [github.com/broccoli111/job-hunt](https://github.com/broccoli111/job-hunt)

## Services

| Service | Required | Command | Port |
|---------|----------|---------|------|
| Next.js dev server | Yes | `pnpm dev` | 3000 |
| Vercel Postgres | Production | Connect via Vercel Storage → injects `POSTGRES_URL` | — |

Local dev without `POSTGRES_URL` uses `.data/store.json`.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

Production: connect Vercel Postgres, run `db/migrations/001_initial_schema.sql`, redeploy, then `POST /api/refresh`.

## Cursor Cloud specific instructions

- **Production requires Vercel Postgres** (`POSTGRES_URL` from Storage tab)
- **Migration:** `db/migrations/001_initial_schema.sql` via Vercel Query tab
- **No Supabase** in this project
- **Cron:** `0 12 * * *` UTC in `vercel.json`
