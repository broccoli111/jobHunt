import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeSalaryAmount } from "@/lib/normalization/salary";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface JSearchJob {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_description?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_google_link?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string;
  job_posted_at_datetime_utc?: string;
}

const SEARCH_QUERIES = [
  "product designer remote",
  "design systems designer remote",
  "staff product designer",
  "senior ux designer remote",
];

/**
 * JSearch API (OpenWeb Ninja) — aggregates Google for Jobs / Indeed / LinkedIn listings.
 * Requires JSEARCH_API_KEY env var (free tier at https://www.openwebninja.com/api/jsearch).
 */
export async function fetchJSearchDesignJobs(): Promise<RawJobPosting[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) return [];

  const byId = new Map<string, RawJobPosting>();

  for (const query of SEARCH_QUERIES) {
    try {
      const url = `https://api.openwebninja.com/jsearch/search?query=${encodeURIComponent(query)}&page=1&num_pages=2&date_posted=month`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
          "User-Agent": "jobHunt/1.0",
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as { data?: JSearchJob[] };
      for (const job of data.data ?? []) {
        const title = job.job_title ?? "";
        if (!isDesignJobTitle(title, job.job_description ?? "")) continue;

        const id = job.job_id ?? `${job.employer_name}-${title}`;
        if (byId.has(id)) continue;

        const location = [job.job_city, job.job_state, job.job_country]
          .filter(Boolean)
          .join(", ");

        byId.set(id, {
          externalId: `jsearch-${id}`,
          companyName: job.employer_name ?? "Unknown",
          title,
          description: normalizeJobText(job.job_description ?? ""),
          location: job.job_is_remote ? "Remote" : location || "Unknown",
          url: job.job_apply_link ?? job.job_google_link ?? "",
          sourceName: "JSearch (Indeed/Google Jobs)",
          sourceType: "job_board",
          salaryMin: normalizeSalaryAmount(job.job_min_salary),
          salaryMax: normalizeSalaryAmount(job.job_max_salary),
          salaryCurrency: job.job_salary_currency ?? "USD",
          postedAt: job.job_posted_at_datetime_utc ?? null,
          rawPayload: job,
        });
      }
    } catch {
      // try next query
    }
  }

  return [...byId.values()].filter((job) => job.url);
}
