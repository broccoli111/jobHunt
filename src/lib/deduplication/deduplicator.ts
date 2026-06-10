import Fuse from "fuse.js";
import {
  normalizeCompanyName,
  normalizeJobTitle,
  normalizeLocation,
  stripHtml,
} from "@/lib/normalization/text";
import type { RawJobPosting, SourceType } from "@/types";

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
  const sameCompany =
    normalizeCompanyName(a.companyName) === normalizeCompanyName(b.companyName);
  const sameTitle =
    normalizeJobTitle(a.title) === normalizeJobTitle(b.title);
  const sameLocation =
    normalizeLocation(a.location) === normalizeLocation(b.location);

  if (sameCompany && sameTitle && sameLocation) return true;

  if (sameCompany && sameTitle) {
    const fuse = new Fuse([b.title], { threshold: 0.2, includeScore: true });
    const result = fuse.search(a.title);
    if (result[0]?.score != null && result[0].score < 0.25) return true;
  }

  if (a.url === b.url) return true;

  return false;
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
      const preferredDesc = stripHtml(preferred.description);
      const alternateDesc = stripHtml(alternate.description);
      return preferredDesc.length >= alternateDesc.length ? preferredDesc : alternateDesc;
    })(),
    location: preferred.location || alternate.location,
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
      description: stripHtml(posting.description),
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
