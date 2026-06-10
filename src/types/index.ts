export type WorkMode = "remote" | "hybrid" | "in_office" | "unknown";
export type SourceType = "company_careers" | "job_board" | "ats";
export type Confidence = "low" | "medium" | "high";
export type RoleFocus =
  | "design_systems"
  | "product_design"
  | "platform_design"
  | "ai_product_design"
  | "ux_infrastructure"
  | "design_tooling"
  | "accessibility";

export type Seniority =
  | "ic6"
  | "staff"
  | "principal"
  | "lead"
  | "senior"
  | "manager"
  | "director"
  | "junior"
  | "mid"
  | "unknown";

export type AtsType = "greenhouse" | "lever" | "ashby" | "workday" | "smartrecruiters";

export interface CompanyConfig {
  name: string;
  domain: string;
  ticker?: string | null;
  isPublic: boolean;
  careersUrl: string;
  ats?: {
    type: AtsType;
    boardToken: string;
  };
}

export interface Company {
  id: string;
  name: string;
  normalized_name: string;
  logo_url: string | null;
  ticker: string | null;
  is_public: boolean;
  careers_url: string | null;
  domain: string | null;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  normalized_title: string;
  description: string | null;
  responsibilities: string | null;
  qualifications: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  location: string | null;
  work_mode: WorkMode;
  seniority: Seniority | string | null;
  role_focus: RoleFocus[] | string[];
  canonical_url: string;
  preferred_source_type: string | null;
  match_percentage: number;
  match_explanation: string | null;
  created_at_source: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
}

export interface JobSource {
  id: string;
  job_id: string;
  source_name: string;
  source_type: SourceType;
  source_url: string;
  discovered_at: string;
}

export interface CompensationEstimate {
  id: string;
  company_id: string;
  level: string | null;
  role_family: string | null;
  base_min: number | null;
  base_max: number | null;
  bonus_min: number | null;
  bonus_max: number | null;
  equity_min: number | null;
  equity_max: number | null;
  total_comp_min: number | null;
  total_comp_max: number | null;
  confidence: Confidence | null;
  source: string | null;
}

export interface StockPrice {
  id: string;
  company_id: string;
  ticker: string;
  price: number | null;
  currency: string;
  fetched_at: string;
}

export interface IngestionRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
  jobs_found: number;
  jobs_added: number;
  jobs_updated: number;
  duplicates_removed: number;
  errors: string[];
}

export interface RawJobPosting {
  externalId: string;
  companyName: string;
  companyDomain?: string;
  title: string;
  description: string;
  location: string;
  url: string;
  sourceName: string;
  sourceType: SourceType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  postedAt?: string | null;
  rawPayload?: unknown;
}

export interface JobWithCompany extends Job {
  company: Company;
  sources?: JobSource[];
  compensation?: CompensationEstimate | null;
  stock_price?: StockPrice | null;
}

export interface JobFilters {
  roleFocus?: RoleFocus[];
  workMode?: WorkMode[];
  seniority?: string[];
  companies?: string[];
  salaryVisibility?: "has_salary" | "no_salary" | "all";
  publicOnly?: boolean | null;
  minMatch?: number;
  sortBy?: "match_percentage" | "last_seen_at" | "company_name";
  sortOrder?: "asc" | "desc";
}

export interface ScoreBreakdown {
  designSystemsRelevance: number;
  seniorityFit: number;
  responsibilityOverlap: number;
  evidenceStrength: number;
  negativeSignals: number;
  matchPercentage: number;
  explanation: string;
}
