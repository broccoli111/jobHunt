import { stripHtml } from "@/lib/normalization/text";
import type { CompanyConfig, RawJobPosting } from "@/types";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories: {
    location?: string;
    team?: string;
    commitment?: string;
  };
  description: string;
  descriptionPlain?: string;
  createdAt: number;
}

function isDesignRole(posting: LeverPosting): boolean {
  const text = `${posting.text} ${posting.categories.team ?? ""}`.toLowerCase();
  return ["design", "ux", "product design", "designer", "design system"].some((k) =>
    text.includes(k),
  );
}

export async function fetchLeverJobs(
  company: CompanyConfig,
  boardToken: string,
): Promise<RawJobPosting[]> {
  const url = `https://api.lever.co/v0/postings/${boardToken}?mode=json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const postings = (await res.json()) as LeverPosting[];

    return (postings ?? [])
      .filter(isDesignRole)
      .map((posting) => ({
        externalId: `lever-${boardToken}-${posting.id}`,
        companyName: company.name,
        companyDomain: company.domain,
        title: posting.text,
        description: posting.descriptionPlain ?? stripHtml(posting.description ?? ""),
        location: posting.categories.location ?? "Unknown",
        url: posting.hostedUrl,
        sourceName: `Lever (${company.name})`,
        sourceType: "ats" as const,
        postedAt: new Date(posting.createdAt).toISOString(),
        rawPayload: posting,
      }));
  } catch {
    return [];
  }
}
