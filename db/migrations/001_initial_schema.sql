-- jobHunt initial schema for Vercel Postgres (standard PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  ticker TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  careers_url TEXT,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT,
  qualifications TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  location TEXT,
  work_mode TEXT CHECK (work_mode IN ('remote', 'hybrid', 'in_office', 'unknown')),
  seniority TEXT,
  role_focus TEXT[] DEFAULT '{}',
  canonical_url TEXT NOT NULL,
  preferred_source_type TEXT,
  match_percentage NUMERIC(5,2) DEFAULT 0,
  match_explanation TEXT,
  created_at_source TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(company_id, normalized_title, location)
);

CREATE INDEX IF NOT EXISTS idx_jobs_match_percentage ON jobs(match_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode ON jobs(work_mode);
CREATE INDEX IF NOT EXISTS idx_jobs_seniority ON jobs(seniority);

CREATE TABLE IF NOT EXISTS job_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('company_careers', 'job_board', 'ats')),
  source_url TEXT NOT NULL,
  raw_payload JSONB,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_sources_job_id ON job_sources(job_id);

CREATE TABLE IF NOT EXISTS compensation_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  level TEXT,
  role_family TEXT DEFAULT 'product_design',
  base_min INTEGER,
  base_max INTEGER,
  bonus_min INTEGER,
  bonus_max INTEGER,
  equity_min INTEGER,
  equity_max INTEGER,
  total_comp_min INTEGER,
  total_comp_max INTEGER,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compensation_company ON compensation_estimates(company_id);

CREATE TABLE IF NOT EXISTS stock_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  price NUMERIC(12,4),
  currency TEXT DEFAULT 'USD',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_prices_company ON stock_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker ON stock_prices(ticker);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  jobs_found INTEGER DEFAULT 0,
  jobs_added INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  duplicates_removed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_metadata (key, value) VALUES ('last_refreshed_at', '')
ON CONFLICT (key) DO NOTHING;
