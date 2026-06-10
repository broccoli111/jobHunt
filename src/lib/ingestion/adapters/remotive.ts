import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

/**
 * Remotive public API — remote-friendly design jobs from a job board.
 * https://remotive.com/api/remote-jobs
 */
export async function fetchRemotiveDesignJobs(): Promise<RawJobPosting[]> {
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?category=design", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      jobs: Array<{
        id: number;
        title: string;
        company_name: string;
        company_logo: string;
        description: string;
        url: string;
        candidate_required_location: string;
        salary?: string;
        publication_date: string;
      }>;
    };

    return (data.jobs ?? []).map((job) => {
      let salaryMin: number | null = null;
      let salaryMax: number | null = null;
      if (job.salary) {
        const nums = job.salary
          .match(/[\d,]+/g)
          ?.map((n) => parseInt(n.replace(/,/g, ""), 10))
          .filter((n) => n >= 10_000);
        if (nums && nums.length >= 2) {
          salaryMin = nums[0];
          salaryMax = nums[1];
        } else if (nums && nums.length === 1) {
          salaryMin = nums[0];
          salaryMax = nums[0];
        }
      }

      return {
        externalId: `remotive-${job.id}`,
        companyName: job.company_name,
        title: job.title,
        description: normalizeJobText(job.description),
        location: job.candidate_required_location || "Remote",
        url: job.url,
        sourceName: "Remotive",
        sourceType: "job_board" as const,
        salaryMin,
        salaryMax,
        salaryCurrency: "USD",
        postedAt: job.publication_date,
        rawPayload: job,
      };
    });
  } catch {
    return [];
  }
}
