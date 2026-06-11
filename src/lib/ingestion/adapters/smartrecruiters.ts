import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import type { CompanyConfig, RawJobPosting } from "@/types";

/**
 * SmartRecruiters public posting API (when companies expose it).
 * GET https://api.smartrecruiters.com/v1/companies/{companyId}/postings
 * Requires company-specific SmartRecruiters company ID.
 */
export async function fetchSmartRecruitersJobs(
  company: CompanyConfig,
  companyId: string,
): Promise<RawJobPosting[]> {
  const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      content?: Array<{
        id: string;
        name: string;
        location: { city?: string; country?: string };
        ref: string;
        releasedDate: string;
        department?: { label: string };
      }>;
    };

    return (data.content ?? [])
      .filter((job) => isDesignJobTitle(job.name, job.department?.label ?? ""))
      .map((job) => ({
        externalId: `smartrecruiters-${companyId}-${job.id}`,
        companyName: company.name,
        companyDomain: company.domain,
        title: job.name,
        description: "",
        location: [job.location.city, job.location.country].filter(Boolean).join(", ") || "Unknown",
        url: `https://jobs.smartrecruiters.com/${companyId}/${job.id}`,
        sourceName: `SmartRecruiters (${company.name})`,
        sourceType: "job_board" as const,
        postedAt: job.releasedDate,
        rawPayload: job,
      }));
  } catch {
    return [];
  }
}
