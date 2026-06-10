# jobHunt

A Vercel-deployable web dashboard that finds, normalizes, deduplicates, scores, and displays relevant product design job opportunities — with a focus on **design systems** and **IC6+ individual contributor** roles.

## Features

- **Weighted match scoring** (0–100%) comparing job responsibilities against a senior design systems leader profile — not simple keyword matching
- **Multi-source ingestion** from Greenhouse, Lever, Ashby ATS APIs plus Remotive job board
- **Configurable seed list** of 90+ top technology companies (`src/config/companies.ts`)
- **Deduplication** across sources with company career page preference
- **Compensation estimates** from public benchmarks with confidence levels
- **Stock prices** for public companies via Yahoo Finance
- **Company logos** via Clearbit Logo API
- **Daily cron refresh** at 7:00 AM Eastern (12:00 UTC) via Vercel Cron
- **Manual refresh** from the dashboard
- **Filters**: role focus, work mode, seniority, company, salary visibility, public/private

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL (Vercel Postgres, Supabase, or local)
- Vercel Cron + serverless API routes

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `CRON_SECRET` | Production | Bearer token for secured refresh |
| `REFRESH_API_KEY` | Optional | Manual refresh header (`x-refresh-key`) |
| `FINNHUB_API_KEY` | Optional | Alternative stock price provider |

**Without `DATABASE_URL`**, the app uses a local file store (`.data/store.json`) for development.

### 3. Run database migrations

Apply `supabase/migrations/001_initial_schema.sql` to your Postgres database:

```bash
# Supabase CLI
supabase db push

# Or psql
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
```

### 4. Start dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Refresh jobs** to ingest postings.

### 5. Build

```bash
pnpm build
pnpm start
```

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/jobs` | GET | List jobs with filters |
| `/api/refresh` | POST/GET | Run ingestion pipeline |
| `/api/score-job` | POST | Score a job posting |
| `/api/companies` | GET | List companies |
| `/api/stock-prices` | GET | Fetch stock quote |

### Score a job manually

```bash
curl -X POST http://localhost:3000/api/score-job \
  -H "Content-Type: application/json" \
  -d '{"title":"Staff Product Designer, Design Systems","description":"Lead component library governance, accessibility, and cross-functional engineering partnerships..."}'
```

## Deploy to Vercel

1. Push to GitHub and import in Vercel
2. Add environment variables (`DATABASE_URL`, `CRON_SECRET`)
3. Connect Vercel Postgres or Supabase
4. Run migrations on the production database
5. Deploy — cron runs daily per `vercel.json`

```json
{
  "crons": [{ "path": "/api/refresh", "schedule": "0 12 * * *" }]
}
```

> **Note:** 7:00 AM Eastern = 12:00 UTC (EST). During EDT (daylight saving), jobs run at 8:00 AM Eastern unless you change to `0 11 * * *`.

## Scoring model

| Factor | Weight |
|--------|--------|
| Design systems relevance | 30% |
| Seniority fit | 20% |
| Responsibility overlap | 25% |
| Evidence strength | 15% |
| Negative signals | 10% |

Candidate profile: `src/config/candidate-profile.ts`

## Adding companies

Edit `src/config/companies.ts`:

```ts
{
  name: "Example Co",
  domain: "example.com",
  ticker: "EXMP",
  isPublic: true,
  careersUrl: "https://example.com/careers",
  ats: { type: "greenhouse", boardToken: "exampleco" },
}
```

## Project structure

```
src/
  app/api/          # API routes
  components/       # Dashboard UI
  config/           # Candidate profile + company seed list
  lib/
    ingestion/      # ATS adapters + orchestrator
    scoring/        # Weighted match engine
    deduplication/  # Fuzzy dedup logic
    db/             # Postgres + file-store fallback
    compensation/   # Public comp benchmarks
    stock/          # Stock price fetcher
supabase/migrations/
vercel.json         # Cron schedule
```

## Known limitations

- **Workday / SmartRecruiters**: Placeholder adapters — tenant-specific endpoints vary per company
- **Google, Apple, Microsoft, Amazon**: No public ATS tokens in seed list; add adapters as needed
- **Compensation data**: Estimated from public benchmarks; not live Levels.fyi API unless configured
- **Stock prices**: Yahoo Finance unofficial API; may rate-limit in production
- **Clearbit logos**: May fail for some domains; falls back to initials
- **Rate limits**: Ingestion batches companies with concurrency limits; full refresh may take several minutes
- **Legal**: Respects robots.txt/ToS by using official ATS APIs and public feeds only

## License

MIT
