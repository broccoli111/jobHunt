import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeJobText } from "@/lib/normalization/text";
import type { CompanyConfig, RawJobPosting } from "@/types";

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  externalLink?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  department?: string;
  team?: string;
}

function isDesignRole(job: AshbyJob): boolean {
  return isDesignJobTitle(job.title, `${job.department ?? ""} ${job.team ?? ""}`);
}

export async function fetchAshbyJobs(
  company: CompanyConfig,
  boardToken: string,
): Promise<RawJobPosting[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardToken}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { jobs: AshbyJob[] };

    return (data.jobs ?? [])
      .filter(isDesignRole)
      .map((job) => ({
        externalId: `ashby-${boardToken}-${job.id}`,
        companyName: company.name,
        companyDomain: company.domain,
        title: job.title,
        description: normalizeJobText(job.descriptionPlain ?? job.descriptionHtml ?? ""),
        location: job.location ?? "Unknown",
        url: job.externalLink ?? `https://jobs.ashbyhq.com/${boardToken}/${job.id}`,
        sourceName: `Ashby (${company.name})`,
        sourceType: "ats" as const,
        postedAt: job.publishedAt ?? null,
        rawPayload: job,
      }));
  } catch {
    return [];
  }
}
