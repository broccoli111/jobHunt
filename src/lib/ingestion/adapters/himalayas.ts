import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface HimalayasJob {
  title: string;
  companyName: string;
  description?: string;
  excerpt?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  employmentType?: string;
  locationRestrictions?: string[];
  applicationLink?: string;
  guid?: string;
  pubDate?: number;
}

const SEARCH_QUERIES = [
  "product designer",
  "design systems",
  "staff designer",
  "ux designer",
  "senior product designer",
];

const MAX_PAGES_PER_QUERY = 5;

/**
 * Himalayas public jobs API — attribution required.
 * https://himalayas.app/api
 */
export async function fetchHimalayasDesignJobs(): Promise<RawJobPosting[]> {
  const byKey = new Map<string, RawJobPosting>();

  for (const query of SEARCH_QUERIES) {
    for (let page = 1; page <= MAX_PAGES_PER_QUERY; page += 1) {
      try {
        const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(query)}&limit=20&page=${page}&sort=recent`;
        const res = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "jobHunt/1.0" },
          next: { revalidate: 3600 },
        });

        if (!res.ok) break;

        const data = (await res.json()) as { jobs?: HimalayasJob[] };
        const jobs = data.jobs ?? [];
        if (jobs.length === 0) break;

        for (const job of jobs) {
          if (!isDesignJobTitle(job.title, job.excerpt ?? "")) continue;

          const key = job.guid ?? `${job.companyName}::${job.title}`;
          if (byKey.has(key)) continue;

          const location =
            job.locationRestrictions?.length ? job.locationRestrictions.join(", ") : "Remote";

          byKey.set(key, {
            externalId: `himalayas-${key.replace(/[^a-z0-9]+/gi, "-")}`,
            companyName: job.companyName,
            title: job.title,
            description: normalizeJobText(job.description ?? job.excerpt ?? ""),
            location,
            url: job.applicationLink ?? `https://himalayas.app/jobs/search?q=${encodeURIComponent(job.title)}`,
            sourceName: "Himalayas",
            sourceType: "job_board",
            salaryMin: job.minSalary ?? null,
            salaryMax: job.maxSalary ?? null,
            salaryCurrency: job.currency ?? "USD",
            postedAt: job.pubDate ? new Date(job.pubDate * 1000).toISOString() : null,
            rawPayload: job,
          });
        }
      } catch {
        break;
      }
    }
  }

  return [...byKey.values()];
}
