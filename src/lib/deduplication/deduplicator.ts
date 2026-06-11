import {
  normalizeCompanyName,
  normalizeJobTitle,
  normalizeJobText,
} from "@/lib/normalization/text";
import type { JobSource, JobWithCompany, RawJobPosting, SourceType } from "@/types";

export interface DeduplicatedJob extends RawJobPosting {
  alternateUrls: Array<{ url: string; sourceName: string; sourceType: SourceType }>;
  preferredSourceType: SourceType;
}

const SOURCE_PRIORITY: Record<SourceType, number> = {
  company_careers: 3,
  ats: 2,
  job_board: 1,
};

function sourceScore(type: SourceType): number {
  return SOURCE_PRIORITY[type] ?? 0;
}

/** Stable key for matching the same role across sources, locations, and ingest runs. */
export function getJobDedupKey(companyName: string, title: string): string {
  return `${normalizeCompanyName(companyName)}::${normalizeJobTitle(title)}`;
}

export function mergeJobLocations(
  ...locations: Array<string | null | undefined>
): string {
  const parts = new Set<string>();

  for (const location of locations) {
    if (!location) continue;
    for (const part of location.split(/\s*[·;|•]\s*|\s+\/\s+/)) {
      const trimmed = part.trim();
      if (trimmed) parts.add(trimmed);
    }
  }

  if (parts.size === 0) return "";
  return [...parts].join(" · ");
}

function mergeSalary(
  a: { min?: number | null; max?: number | null },
  b: { min?: number | null; max?: number | null },
): { min: number | null; max: number | null } {
  const min =
    a.min != null && b.min != null ? Math.max(a.min, b.min) : a.min ?? b.min ?? null;
  const max =
    a.max != null && b.max != null ? Math.min(a.max, b.max) : a.max ?? b.max ?? null;
  return { min, max };
}

function isLikelyDuplicate(a: RawJobPosting, b: RawJobPosting): boolean {
  if (a.url === b.url) return true;
  return getJobDedupKey(a.companyName, a.title) === getJobDedupKey(b.companyName, b.title);
}

function pickPreferred(
  existing: DeduplicatedJob,
  incoming: RawJobPosting,
): DeduplicatedJob {
  const existingScore = sourceScore(existing.preferredSourceType);
  const incomingScore = sourceScore(incoming.sourceType);

  const preferred = incomingScore > existingScore ? incoming : existing;
  const alternate = incomingScore > existingScore ? existing : incoming;

  const salary = mergeSalary(
    { min: existing.salaryMin, max: existing.salaryMax },
    { min: incoming.salaryMin, max: incoming.salaryMax },
  );

  const alternateUrls = [
    ...existing.alternateUrls,
    {
      url: alternate.url,
      sourceName: alternate.sourceName,
      sourceType: alternate.sourceType,
    },
  ];

  // Deduplicate alternate URLs
  const seen = new Set<string>();
  const uniqueAlternates = alternateUrls.filter((u) => {
    if (seen.has(u.url)) return false;
    seen.add(u.url);
    return u.url !== preferred.url;
  });

  return {
    externalId: preferred.externalId,
    companyName: preferred.companyName,
    companyDomain: preferred.companyDomain ?? alternate.companyDomain,
    title: preferred.title,
    description: (() => {
      const preferredDesc = normalizeJobText(preferred.description);
      const alternateDesc = normalizeJobText(alternate.description);
      return preferredDesc.length >= alternateDesc.length ? preferredDesc : alternateDesc;
    })(),
    location: mergeJobLocations(preferred.location, alternate.location),
    url: preferred.url,
    sourceName: preferred.sourceName,
    sourceType: preferred.sourceType,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: preferred.salaryCurrency ?? alternate.salaryCurrency,
    postedAt: preferred.postedAt ?? alternate.postedAt,
    rawPayload: preferred.rawPayload,
    alternateUrls: uniqueAlternates,
    preferredSourceType: preferred.sourceType,
  };
}

export function deduplicateJobs(postings: RawJobPosting[]): {
  jobs: DeduplicatedJob[];
  duplicatesRemoved: number;
} {
  const result: DeduplicatedJob[] = [];
  let duplicatesRemoved = 0;

  for (const posting of postings) {
    const normalizedPosting: RawJobPosting = {
      ...posting,
      description: normalizeJobText(posting.description),
    };

    let merged = false;

    for (let i = 0; i < result.length; i++) {
      if (isLikelyDuplicate(result[i], normalizedPosting)) {
        result[i] = pickPreferred(result[i], normalizedPosting);
        merged = true;
        duplicatesRemoved++;
        break;
      }
    }

    if (!merged) {
      result.push({
        ...normalizedPosting,
        alternateUrls: [],
        preferredSourceType: normalizedPosting.sourceType,
      });
    }
  }

  return { jobs: result, duplicatesRemoved };
}

function storedJobPreferenceScore(job: JobWithCompany): number {
  const sourceType = job.preferred_source_type as SourceType | null;
  const sourcePoints = sourceScore(sourceType ?? "job_board") * 1000;
  return sourcePoints + Number(job.match_percentage ?? 0);
}

function mergeStoredJobGroup(jobs: JobWithCompany[]): JobWithCompany {
  const sorted = [...jobs].sort(
    (a, b) => storedJobPreferenceScore(b) - storedJobPreferenceScore(a),
  );
  const preferred = sorted[0];

  const sourcesByUrl = new Map<string, JobSource>();
  for (const job of sorted) {
    for (const source of job.sources ?? []) {
      sourcesByUrl.set(source.source_url, source);
    }
  }

  const salaryMin = sorted.reduce<number | null>((best, job) => {
    if (job.salary_min == null) return best;
    return best == null ? job.salary_min : Math.max(best, job.salary_min);
  }, null);

  const salaryMax = sorted.reduce<number | null>((best, job) => {
    if (job.salary_max == null) return best;
    return best == null ? job.salary_max : Math.min(best, job.salary_max);
  }, null);

  return {
    ...preferred,
    location: mergeJobLocations(...sorted.map((job) => job.location)),
    salary_min: salaryMin,
    salary_max: salaryMax,
    sources: [...sourcesByUrl.values()],
  };
}

/** Collapse duplicate rows already stored in the database (e.g. location text changed between refreshes). */
export function deduplicateStoredJobs<T extends JobWithCompany>(jobs: T[]): T[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];

  for (const job of jobs) {
    const key = getJobDedupKey(job.company.normalized_name || job.company.name, job.title);
    if (!groups.has(key)) order.push(key);
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }

  return order.map((key) => {
    const group = groups.get(key)!;
    return group.length === 1 ? group[0] : (mergeStoredJobGroup(group) as T);
  });
}
