# jobHunt

A Vercel-deployable web dashboard that finds, normalizes, deduplicates, scores, and displays relevant product design job opportunities — with a focus on **design systems** and **IC6+ individual contributor** roles.

**Stack:** Next.js + TypeScript + Tailwind + **Vercel Postgres** + Vercel Cron. No Supabase required.

## Features

- **Weighted match scoring** (0–100%) comparing job responsibilities against a senior design systems leader profile
- **Multi-source ingestion** from Greenhouse, Lever, Ashby ATS APIs plus Remotive job board
- **Configurable seed list** of 90+ top technology companies (`src/config/companies.ts`)
- **Deduplication**, compensation estimates, stock prices, company logos
- **Daily cron refresh** at 7:00 AM Eastern via Vercel Cron
- **Filters**: role focus, work mode, seniority, company, salary visibility, public/private

## Repository

**GitHub:** [github.com/broccoli111/job-hunt](https://github.com/broccoli111/job-hunt)

## Deploy to Vercel (full setup)

### 1. Import project

1. [vercel.com/new](https://vercel.com/new) → import `broccoli111/job-hunt`
2. **Framework Preset:** Next.js
3. **Root Directory:** leave empty
4. Deploy once (app works in-memory; yellow banner until Postgres is connected)

### 2. Add Vercel Postgres

1. Project → **Storage** → **Create Database** → **Postgres**
2. Name it (e.g. `job-hunt-db`) → **Connect** to this project
3. Vercel auto-adds `POSTGRES_URL` — the app reads it automatically

### 3. Run database migration

**Option A (easiest):** Open your deployed site → click **Run database migration** in the yellow setup banner. This uses `POSTGRES_URL` on Vercel — no copy/paste needed.

**Option B:** Storage → Postgres → **Query** tab → paste `db/migrations/001_initial_schema.sql` → Run

**Option C:** Locally after `vercel env pull`: `pnpm db:migrate`

### 4. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Auto | Injected when Postgres Storage is connected |
| `CRON_SECRET` | Recommended | Random string; secures `/api/refresh` |

Set `CRON_SECRET` under **Settings → Environment Variables**.

### 5. Redeploy and ingest

1. **Deployments** → ⋯ → **Redeploy** (uncheck build cache)
2. Open your site → **Refresh jobs**

The yellow “in-memory only” warning should disappear once `POSTGRES_URL` is active.

## Local development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `POSTGRES_URL`, local dev uses `.data/store.json` (no Vercel account needed for basic testing). To test against production Postgres locally, run `vercel env pull` and add `POSTGRES_URL` to `.env.local`.

```bash
pnpm build
pnpm lint
```

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/jobs` | GET | List jobs with filters |
| `/api/refresh` | POST/GET | Run ingestion pipeline |
| `/api/score-job` | POST | Score a job posting |
| `/api/companies` | GET | List companies |
| `/api/stock-prices` | GET | Fetch stock quote |

## Cron schedule

`vercel.json` runs `/api/refresh` daily at 12:00 UTC (7:00 AM EST):

```json
{ "crons": [{ "path": "/api/refresh", "schedule": "0 12 * * *" }] }
```

## Scoring model

| Factor | Weight |
|--------|--------|
| Design systems relevance | 30% |
| Seniority fit | 20% |
| Responsibility overlap | 25% |
| Evidence strength | 15% |
| Negative signals | 10% |

Profile: `src/config/candidate-profile.ts`

## Project structure

```
src/app/api/        # API routes
src/components/     # Dashboard UI
src/config/         # Candidate profile + companies
src/lib/db/         # Vercel Postgres client
db/migrations/      # SQL schema for Vercel Postgres
vercel.json         # Cron + build config
```

## Known limitations

- Workday / SmartRecruiters adapters are stubs
- Compensation data uses public benchmarks, not live APIs
- Stock prices via Yahoo Finance (may rate-limit)
- Clearbit logos may fail; falls back to initials

## License

MIT
