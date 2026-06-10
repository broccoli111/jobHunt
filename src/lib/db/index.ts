import { FileDatabase } from "@/lib/db/file-store";
import { getMemoryDatabase } from "@/lib/db/memory-store";
import { PostgresDatabase } from "@/lib/db/postgres";
import { resolveDatabaseUrl } from "@/lib/db/resolve-database-url";
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

export interface Database {
  getCompanies(): Promise<Company[]>;
  getCompanyByNormalizedName(name: string): Promise<Company | null>;
  upsertCompany(data: Omit<Company, "id"> & { id?: string }): Promise<Company>;
  getJobs(filters?: JobFilters): Promise<JobWithCompany[]>;
  upsertJob(
    companyId: string,
    data: Omit<Job, "id" | "company_id" | "first_seen_at"> & { id?: string },
  ): Promise<{ job: Job; created: boolean }>;
  addJobSource(source: Omit<JobSource, "id">): Promise<JobSource>;
  upsertCompensation(data: Omit<CompensationEstimate, "id">): Promise<void>;
  upsertStockPrice(data: Omit<StockPrice, "id">): Promise<void>;
  startIngestionRun(): Promise<IngestionRun>;
  completeIngestionRun(id: string, data: Partial<IngestionRun>): Promise<void>;
  setMetadata(key: string, value: string): Promise<void>;
  getMetadata(key: string): Promise<string | null>;
}

let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (dbInstance) return dbInstance;

  const connectionString = resolveDatabaseUrl();

  if (connectionString) {
    dbInstance = new PostgresDatabase(connectionString);
  } else if (process.env.VERCEL) {
    // Vercel serverless: filesystem is ephemeral — use in-memory store
    dbInstance = getMemoryDatabase();
  } else {
    // Local dev fallback when DATABASE_URL is not configured
    dbInstance = new FileDatabase();
  }

  return dbInstance;
}

export function isUsingFileStore(): boolean {
  return !resolveDatabaseUrl() && !process.env.VERCEL;
}
