import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeSalaryAmount } from "@/lib/normalization/salary";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface RemoteOkJob {
  id: string;
  slug: string;
  position: string;
  company: string;
  description?: string;
  location?: string;
  date?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  url?: string;
  apply_url?: string;
}

/**
 * Remote OK public API (attribution + link back required).
 * https://remoteok.com/api
 */
export async function fetchRemoteOkDesignJobs(): Promise<RawJobPosting[]> {
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { Accept: "application/json", "User-Agent": "jobHunt/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as Array<RemoteOkJob | { legal?: string }>;
    const postings = data.filter((item): item is RemoteOkJob => "id" in item && "position" in item);

    return postings
      .filter((job) => {
        const context = `${(job.tags ?? []).join(" ")} ${job.location ?? ""}`;
        return isDesignJobTitle(job.position, context);
      })
      .map((job) => {
        const salaryMin = normalizeSalaryAmount(
          job.salary_min && job.salary_min >= 10_000 ? job.salary_min : null,
        );
        const salaryMax = normalizeSalaryAmount(
          job.salary_max && job.salary_max >= 10_000 ? job.salary_max : null,
        );

        return {
          externalId: `remoteok-${job.id}`,
          companyName: job.company,
          title: job.position,
          description: normalizeJobText(job.description ?? ""),
          location: job.location?.trim() || "Remote",
          url: job.url ?? job.apply_url ?? `https://remoteok.com/remote-jobs/${job.slug}`,
          sourceName: "Remote OK",
          sourceType: "job_board" as const,
          salaryMin,
          salaryMax,
          salaryCurrency: "USD",
          postedAt: job.date ?? null,
          rawPayload: job,
        };
      });
  } catch {
    return [];
  }
}
