import { DESIGN_DEPARTMENT_KEYWORDS } from "@/config/companies";
import { normalizeJobText } from "@/lib/normalization/text";
import type { CompanyConfig } from "@/types";
import type { RawJobPosting } from "@/types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  departments: Array<{ name: string }>;
  content?: string;
  updated_at: string;
}

function isDesignRole(job: GreenhouseJob): boolean {
  const titleLower = job.title.toLowerCase();
  const deptText = job.departments.map((d) => d.name.toLowerCase()).join(" ");

  if (DESIGN_DEPARTMENT_KEYWORDS.some((k) => deptText.includes(k) || titleLower.includes(k))) {
    return true;
  }

  const designTitlePatterns = [
    "designer",
    "design",
    "ux",
    "user experience",
    "product design",
    "design system",
  ];
  return designTitlePatterns.some((p) => titleLower.includes(p));
}

export async function fetchGreenhouseJobs(
  company: CompanyConfig,
  boardToken: string,
): Promise<RawJobPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { jobs: GreenhouseJob[] };

    return (data.jobs ?? [])
      .filter(isDesignRole)
      .map((job) => ({
        externalId: `greenhouse-${boardToken}-${job.id}`,
        companyName: company.name,
        companyDomain: company.domain,
        title: job.title,
        description: normalizeJobText(job.content ?? ""),
        location: job.location?.name ?? "Unknown",
        url: job.absolute_url,
        sourceName: `Greenhouse (${company.name})`,
        sourceType: "ats" as const,
        postedAt: job.updated_at,
        rawPayload: job,
      }));
  } catch {
    return [];
  }
}
