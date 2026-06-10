import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  location?: string;
  created_at?: number;
}

/**
 * Arbeitnow free job board API (Europe + remote).
 * https://www.arbeitnow.com/blog/job-board-api
 */
export async function fetchArbeitnowDesignJobs(): Promise<RawJobPosting[]> {
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { Accept: "application/json", "User-Agent": "jobHunt/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { data?: ArbeitnowJob[] };

    return (data.data ?? [])
      .filter((job) => {
        const context = `${(job.tags ?? []).join(" ")} ${job.location ?? ""}`;
        return isDesignJobTitle(job.title, context);
      })
      .map((job) => ({
        externalId: `arbeitnow-${job.slug}`,
        companyName: job.company_name,
        title: job.title,
        description: normalizeJobText(job.description ?? ""),
        location: job.remote ? "Remote" : job.location ?? "Unknown",
        url: job.url,
        sourceName: "Arbeitnow",
        sourceType: "job_board" as const,
        postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
        rawPayload: job,
      }));
  } catch {
    return [];
  }
}
