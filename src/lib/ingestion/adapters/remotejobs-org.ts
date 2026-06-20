import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeSalaryAmount } from "@/lib/normalization/salary";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface RemoteJobsOrgJob {
  id: string;
  title: string;
  url: string;
  apply_url?: string;
  company: { name: string };
  location?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  description?: string;
  posted_at?: string;
}

/**
 * RemoteJobs.org public API — attribution required.
 * https://remotejobs.org/api-access
 */
export async function fetchRemoteJobsOrgDesignJobs(): Promise<RawJobPosting[]> {
  const results: RawJobPosting[] = [];
  let offset = 0;
  const limit = 50;
  const maxPages = 6;

  for (let page = 0; page < maxPages; page += 1) {
    try {
      const url = `https://remotejobs.org/api/v1/jobs?category=design&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "jobHunt/1.0" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) break;

      const data = (await res.json()) as {
        data?: RemoteJobsOrgJob[];
        pagination?: { has_more?: boolean };
      };

      const jobs = data.data ?? [];
      if (jobs.length === 0) break;

      for (const job of jobs) {
        if (!isDesignJobTitle(job.title)) continue;

        results.push({
          externalId: `remotejobsorg-${job.id}`,
          companyName: job.company.name,
          title: job.title,
          description: normalizeJobText(job.description ?? ""),
          location: job.location ?? "Remote",
          url: job.apply_url ?? job.url,
          sourceName: "RemoteJobs.org",
          sourceType: "job_board",
          salaryMin: normalizeSalaryAmount(job.salary_min),
          salaryMax: normalizeSalaryAmount(job.salary_max),
          salaryCurrency: "USD",
          postedAt: job.posted_at ?? null,
          rawPayload: job,
        });
      }

      if (!data.pagination?.has_more) break;
      offset += limit;
    } catch {
      break;
    }
  }

  return results;
}
