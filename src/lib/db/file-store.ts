import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { TECH_COMPANIES } from "@/config/companies";
import { mergeJobLocations } from "@/lib/deduplication/deduplicator";
import { getLogoUrl } from "@/lib/logos";
import { normalizeCompanyName, normalizeJobTitle } from "@/lib/normalization/text";
import type {
  Company,
  CompensationEstimate,
  IngestionRun,
  Job,
  JobFilters,
  JobSource,
  JobWithCompany,
  StockPrice,
} from "@/types";

function getStorePaths(): { dataDir: string; storeFile: string } {
  const dataDir = process.env.VERCEL
    ? path.join("/tmp", "jobhunt")
    : path.join(process.cwd(), ".data");
  return { dataDir, storeFile: path.join(dataDir, "store.json") };
}

interface FileStore {
  companies: Company[];
  jobs: Job[];
  job_sources: JobSource[];
  compensation_estimates: CompensationEstimate[];
  stock_prices: StockPrice[];
  ingestion_runs: IngestionRun[];
  metadata: Record<string, string>;
}

function defaultStore(): FileStore {
  const companies: Company[] = TECH_COMPANIES.map((c) => ({
    id: randomUUID(),
    name: c.name,
    normalized_name: normalizeCompanyName(c.name),
    logo_url: getLogoUrl(c.domain),
    ticker: c.ticker ?? null,
    is_public: c.isPublic,
    careers_url: c.careersUrl,
    domain: c.domain,
  }));

  return {
    companies,
    jobs: [],
    job_sources: [],
    compensation_estimates: [],
    stock_prices: [],
    ingestion_runs: [],
    metadata: { last_refreshed_at: "" },
  };
}

function loadStore(): FileStore {
  const { dataDir, storeFile } = getStorePaths();
  if (existsSync(storeFile)) {
    return JSON.parse(readFileSync(storeFile, "utf-8")) as FileStore;
  }
  return defaultStore();
}

function saveStore(store: FileStore): void {
  try {
    const { dataDir, storeFile } = getStorePaths();
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(storeFile, JSON.stringify(store, null, 2));
  } catch (error) {
    console.warn("file-store: could not persist (read-only or ephemeral fs)", error);
  }
}

export class FileDatabase {
  private store: FileStore;

  constructor() {
    this.store = loadStore();
  }

  private persist() {
    saveStore(this.store);
  }

  async getCompanies(): Promise<Company[]> {
    return this.store.companies;
  }

  async getCompanyByNormalizedName(name: string): Promise<Company | null> {
    return this.store.companies.find((c) => c.normalized_name === name) ?? null;
  }

  async upsertCompany(data: Omit<Company, "id"> & { id?: string }): Promise<Company> {
    const existing = this.store.companies.find(
      (c) => c.normalized_name === data.normalized_name,
    );
    if (existing) {
      Object.assign(existing, { ...data, id: existing.id });
      this.persist();
      return existing;
    }
    const company: Company = { ...data, id: data.id ?? randomUUID() } as Company;
    this.store.companies.push(company);
    this.persist();
    return company;
  }

  async getJobs(filters: JobFilters = {}): Promise<JobWithCompany[]> {
    let jobs = this.store.jobs.filter((j) => j.is_active);

    if (filters.workMode?.length) {
      jobs = jobs.filter((j) => filters.workMode!.includes(j.work_mode));
    }
    if (filters.seniority?.length) {
      jobs = jobs.filter((j) => j.seniority && filters.seniority!.includes(j.seniority));
    }
    if (filters.roleFocus?.length) {
      jobs = jobs.filter((j) =>
        j.role_focus.some((f) => filters.roleFocus!.includes(f as never)),
      );
    }
    if (filters.companies?.length) {
      jobs = jobs.filter((j) => filters.companies!.includes(j.company_id));
    }
    if (filters.salaryVisibility === "has_salary") {
      jobs = jobs.filter((j) => j.salary_min != null || j.salary_max != null);
    }
    if (filters.salaryVisibility === "no_salary") {
      jobs = jobs.filter((j) => j.salary_min == null && j.salary_max == null);
    }
    if (filters.publicOnly === true) {
      const publicIds = new Set(
        this.store.companies.filter((c) => c.is_public).map((c) => c.id),
      );
      jobs = jobs.filter((j) => publicIds.has(j.company_id));
    }
    if (filters.publicOnly === false) {
      const privateIds = new Set(
        this.store.companies.filter((c) => !c.is_public).map((c) => c.id),
      );
      jobs = jobs.filter((j) => privateIds.has(j.company_id));
    }
    if (filters.minMatch != null) {
      jobs = jobs.filter((j) => j.match_percentage >= filters.minMatch!);
    }

    const sortBy = filters.sortBy ?? "match_percentage";
    const sortOrder = filters.sortOrder ?? "desc";

    jobs.sort((a, b) => {
      const av = sortBy === "company_name"
        ? this.store.companies.find((c) => c.id === a.company_id)?.name ?? ""
        : sortBy === "last_seen_at"
          ? a.last_seen_at
          : a.match_percentage;
      const bv = sortBy === "company_name"
        ? this.store.companies.find((c) => c.id === b.company_id)?.name ?? ""
        : sortBy === "last_seen_at"
          ? b.last_seen_at
          : b.match_percentage;
      if (av < bv) return sortOrder === "asc" ? -1 : 1;
      if (av > bv) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return jobs.map((job) => {
      const company = this.store.companies.find((c) => c.id === job.company_id)!;
      const compensation = this.store.compensation_estimates.find(
        (c) => c.company_id === job.company_id,
      ) ?? null;
      const stock = this.store.stock_prices
        .filter((s) => s.company_id === job.company_id)
        .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))[0] ?? null;
      const sources = this.store.job_sources.filter((s) => s.job_id === job.id);

      return { ...job, company, compensation, stock_price: stock, sources };
    });
  }

  async upsertJob(
    companyId: string,
    data: Omit<Job, "id" | "company_id" | "first_seen_at"> & { id?: string },
  ): Promise<{ job: Job; created: boolean }> {
    const normalized = normalizeJobTitle(data.normalized_title || data.title);
    const existing = this.store.jobs.find(
      (j) => j.company_id === companyId && j.normalized_title === normalized,
    );

    const now = new Date().toISOString();

    if (existing) {
      Object.assign(existing, {
        ...data,
        normalized_title: normalized,
        location: mergeJobLocations(existing.location, data.location),
        last_seen_at: now,
        is_active: true,
      });

      for (const job of this.store.jobs) {
        if (
          job.company_id === companyId &&
          job.normalized_title === normalized &&
          job.id !== existing.id
        ) {
          job.is_active = false;
        }
      }

      this.persist();
      return { job: existing, created: false };
    }

    const job: Job = {
      ...data,
      id: data.id ?? randomUUID(),
      company_id: companyId,
      normalized_title: normalized,
      first_seen_at: now,
      last_seen_at: now,
      is_active: true,
    } as Job;
    this.store.jobs.push(job);
    this.persist();
    return { job, created: true };
  }

  async addJobSource(source: Omit<JobSource, "id">): Promise<JobSource> {
    const record: JobSource = { ...source, id: randomUUID() };
    this.store.job_sources.push(record);
    this.persist();
    return record;
  }

  async upsertCompensation(data: Omit<CompensationEstimate, "id">): Promise<void> {
    const existing = this.store.compensation_estimates.find(
      (c) => c.company_id === data.company_id,
    );
    if (existing) Object.assign(existing, data);
    else this.store.compensation_estimates.push({ ...data, id: randomUUID() });
    this.persist();
  }

  async upsertStockPrice(data: Omit<StockPrice, "id">): Promise<void> {
    this.store.stock_prices.push({ ...data, id: randomUUID() });
    this.persist();
  }

  async startIngestionRun(): Promise<IngestionRun> {
    const run: IngestionRun = {
      id: randomUUID(),
      started_at: new Date().toISOString(),
      completed_at: null,
      status: "running",
      jobs_found: 0,
      jobs_added: 0,
      jobs_updated: 0,
      duplicates_removed: 0,
      errors: [],
    };
    this.store.ingestion_runs.push(run);
    this.persist();
    return run;
  }

  async completeIngestionRun(
    id: string,
    data: Partial<IngestionRun>,
  ): Promise<void> {
    const run = this.store.ingestion_runs.find((r) => r.id === id);
    if (run) {
      Object.assign(run, {
        ...data,
        completed_at: new Date().toISOString(),
        status: data.status ?? "completed",
      });
      this.persist();
    }
  }

  async setMetadata(key: string, value: string): Promise<void> {
    this.store.metadata[key] = value;
    this.persist();
  }

  async getMetadata(key: string): Promise<string | null> {
    return this.store.metadata[key] ?? null;
  }

  async deactivateStaleJobs(seenAfter: string): Promise<void> {
    for (const job of this.store.jobs) {
      if (job.last_seen_at < seenAfter) job.is_active = false;
    }
    this.persist();
  }
}
