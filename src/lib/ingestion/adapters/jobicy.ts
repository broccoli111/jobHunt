import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeSalaryAmount } from "@/lib/normalization/salary";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
}

const SEARCH_TAGS = [
  "product designer",
  "design systems",
  "staff designer",
  "ux designer",
  "senior designer",
];

/**
 * Jobicy public API — remote jobs (attribution required).
 * https://jobicy.com/api/v2/remote-jobs
 */
export async function fetchJobicyDesignJobs(): Promise<RawJobPosting[]> {
  const byId = new Map<number, RawJobPosting>();

  for (const tag of SEARCH_TAGS) {
    try {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "jobHunt/1.0" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as { jobs?: JobicyJob[] };

      for (const job of data.jobs ?? []) {
        if (!isDesignJobTitle(job.jobTitle)) continue;
        if (byId.has(job.id)) continue;

        byId.set(job.id, {
          externalId: `jobicy-${job.id}`,
          companyName: job.companyName,
          title: job.jobTitle,
          description: normalizeJobText(job.jobDescription ?? ""),
          location: job.jobGeo?.trim() || "Remote",
          url: job.url,
          sourceName: "Jobicy",
          sourceType: "job_board",
          salaryMin: normalizeSalaryAmount(job.annualSalaryMin),
          salaryMax: normalizeSalaryAmount(job.annualSalaryMax),
          salaryCurrency: job.salaryCurrency ?? "USD",
          postedAt: job.pubDate ?? null,
          rawPayload: job,
        });
      }
    } catch {
      // try next tag query
    }
  }

  return [...byId.values()];
}
