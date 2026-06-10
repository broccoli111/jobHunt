import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  description: string;
  url: string;
  candidate_required_location: string;
  salary?: string;
  publication_date: string;
}

const REMOTIVE_FEEDS = [
  "https://remotive.com/api/remote-jobs?category=design",
  "https://remotive.com/api/remote-jobs?category=product",
  "https://remotive.com/api/remote-jobs?search=product%20designer",
  "https://remotive.com/api/remote-jobs?search=design%20systems",
  "https://remotive.com/api/remote-jobs?search=staff%20designer",
];

function mapRemotiveJob(job: RemotiveJob): RawJobPosting {
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
    sourceType: "job_board",
    salaryMin,
    salaryMax,
    salaryCurrency: "USD",
    postedAt: job.publication_date,
    rawPayload: job,
  };
}

/**
 * Remotive public API — remote-friendly design jobs from a job board.
 * https://remotive.com/api/remote-jobs
 */
export async function fetchRemotiveDesignJobs(): Promise<RawJobPosting[]> {
  const byId = new Map<number, RawJobPosting>();

  for (const feedUrl of REMOTIVE_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { Accept: "application/json", "User-Agent": "jobHunt/1.0" },
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as { jobs?: RemotiveJob[] };

      for (const job of data.jobs ?? []) {
        if (!isDesignJobTitle(job.title, job.description)) continue;
        if (!byId.has(job.id)) {
          byId.set(job.id, mapRemotiveJob(job));
        }
      }
    } catch {
      // try next feed
    }
  }

  return [...byId.values()];
}
