import { isDesignJobTitle } from "@/lib/ingestion/design-filter";
import { normalizeJobText } from "@/lib/normalization/text";
import type { RawJobPosting } from "@/types";

function readTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * We Work Remotely design category RSS feed.
 * https://weworkremotely.com/categories/remote-design-jobs.rss
 */
export async function fetchWeWorkRemotelyDesignJobs(): Promise<RawJobPosting[]> {
  try {
    const res = await fetch("https://weworkremotely.com/categories/remote-design-jobs.rss", {
      headers: { Accept: "application/rss+xml", "User-Agent": "jobHunt/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

    return items
      .map((match) => {
        const block = match[1];
        const rawTitle = decodeXml(readTag(block, "title"));
        const link = decodeXml(readTag(block, "link"));
        const description = normalizeJobText(decodeXml(readTag(block, "description")));
        const region = decodeXml(readTag(block, "region"));

        const [companyPart, ...titleParts] = rawTitle.split(":");
        const companyName = titleParts.length > 0 ? companyPart.trim() : "Unknown";
        const title = titleParts.length > 0 ? titleParts.join(":").trim() : rawTitle;

        return {
          externalId: `wwr-${link.replace(/[^a-z0-9]+/gi, "-").slice(0, 80)}`,
          companyName,
          title,
          description,
          location: region || "Remote",
          url: link,
          sourceName: "We Work Remotely",
          sourceType: "job_board" as const,
          postedAt: decodeXml(readTag(block, "pubDate")) || null,
          rawPayload: { title: rawTitle, link },
        } satisfies RawJobPosting;
      })
      .filter((job) => isDesignJobTitle(job.title, job.description));
  } catch {
    return [];
  }
}
