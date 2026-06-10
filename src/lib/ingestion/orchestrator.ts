import { TECH_COMPANIES } from "@/config/companies";
import { deduplicateJobs } from "@/lib/deduplication/deduplicator";
import { enrichPostingSalary } from "@/lib/ingestion/enrich-posting";
import { fetchAshbyJobs } from "@/lib/ingestion/adapters/ashby";
import { fetchGreenhouseJobs } from "@/lib/ingestion/adapters/greenhouse";
import { fetchLeverJobs } from "@/lib/ingestion/adapters/lever";
import { fetchArbeitnowDesignJobs } from "@/lib/ingestion/adapters/arbeitnow";
import { fetchJobicyDesignJobs } from "@/lib/ingestion/adapters/jobicy";
import { fetchRemoteOkDesignJobs } from "@/lib/ingestion/adapters/remoteok";
import { fetchRemotiveDesignJobs } from "@/lib/ingestion/adapters/remotive";
import { fetchWorkdayJobs } from "@/lib/ingestion/adapters/workday";
import { extractTextSections } from "@/lib/normalization/text";
import {
  inferRoleFocus,
  inferSeniority,
  inferWorkMode,
  scoreJob,
} from "@/lib/scoring/job-scorer";
import type { CompanyConfig, RawJobPosting, SourceType } from "@/types";

const CONCURRENCY = 5;

async function fetchCompanyJobs(company: CompanyConfig): Promise<RawJobPosting[]> {
  if (!company.ats) return [];

  const { type, boardToken } = company.ats;

  switch (type) {
    case "greenhouse":
      return fetchGreenhouseJobs(company, boardToken);
    case "lever":
      return fetchLeverJobs(company, boardToken);
    case "ashby":
      return fetchAshbyJobs(company, boardToken);
    case "workday":
      return fetchWorkdayJobs();
    default:
      return [];
  }
}

async function mapPool<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export interface ProcessedJob {
  posting: RawJobPosting;
  normalizedTitle: string;
  workMode: ReturnType<typeof inferWorkMode>;
  seniority: ReturnType<typeof inferSeniority>;
  roleFocus: ReturnType<typeof inferRoleFocus>;
  responsibilities: string;
  qualifications: string;
  matchPercentage: number;
  matchExplanation: string;
  alternateUrls: Array<{ url: string; sourceName: string; sourceType: SourceType }>;
  preferredSourceType: SourceType;
}

export interface IngestionResult {
  rawCount: number;
  deduplicatedCount: number;
  duplicatesRemoved: number;
  jobs: ProcessedJob[];
  errors: string[];
}

export async function runIngestion(): Promise<IngestionResult> {
  const errors: string[] = [];
  const allPostings: RawJobPosting[] = [];

  const companiesWithAts = TECH_COMPANIES.filter((c) => c.ats);

  const companyResults = await mapPool(
    companiesWithAts,
    async (company) => {
      try {
        return await fetchCompanyJobs(company);
      } catch (e) {
        errors.push(`${company.name}: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      }
    },
    CONCURRENCY,
  );

  for (const jobs of companyResults) {
    allPostings.push(...jobs);
  }

  const jobBoardFetchers: Array<{ name: string; fetch: () => Promise<RawJobPosting[]> }> = [
    { name: "Remotive", fetch: fetchRemotiveDesignJobs },
    { name: "Jobicy", fetch: fetchJobicyDesignJobs },
    { name: "Arbeitnow", fetch: fetchArbeitnowDesignJobs },
    { name: "Remote OK", fetch: fetchRemoteOkDesignJobs },
  ];

  for (const { name, fetch } of jobBoardFetchers) {
    try {
      allPostings.push(...(await fetch()));
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const enrichedPostings = allPostings.map(enrichPostingSalary);
  const { jobs: deduped, duplicatesRemoved } = deduplicateJobs(enrichedPostings);

  const processed: ProcessedJob[] = deduped.map((job) => {
    const { responsibilities, qualifications } = extractTextSections(job.description);
    const workMode = inferWorkMode(job.location, job.description);
    const seniority = inferSeniority(job.title, job.description);
    const roleFocus = inferRoleFocus(job.title, job.description);
    const score = scoreJob({
      title: job.title,
      description: job.description,
      location: job.location,
      workMode,
      remoteFilterActive: true,
    });

    return {
      posting: job,
      normalizedTitle: job.title.toLowerCase().replace(/\s+/g, " ").trim(),
      workMode,
      seniority,
      roleFocus,
      responsibilities,
      qualifications,
      matchPercentage: score.matchPercentage,
      matchExplanation: score.explanation,
      alternateUrls: job.alternateUrls,
      preferredSourceType: job.preferredSourceType,
    };
  });

  return {
    rawCount: allPostings.length,
    deduplicatedCount: processed.length,
    duplicatesRemoved,
    jobs: processed,
    errors,
  };
}
