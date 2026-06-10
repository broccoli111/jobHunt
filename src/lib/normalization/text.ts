/**
 * Text normalization utilities for deduplication and matching.
 */

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.']/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeJobTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[–—-]/g, " ")
    .replace(/\b(senior|sr|staff|principal|lead|ii|iii|iv|v|vi)\b/g, (m) => m)
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/remote/gi, "remote")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTextSections(description: string): {
  fullText: string;
  responsibilities: string;
  qualifications: string;
} {
  const fullText = stripHtml(description);
  const lower = fullText.toLowerCase();

  const respMarkers = ["responsibilities", "what you'll do", "what you will do", "the role"];
  const qualMarkers = ["qualifications", "requirements", "what you'll bring", "what you will bring"];

  let responsibilities = "";
  let qualifications = "";

  for (const marker of respMarkers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      responsibilities = fullText.slice(idx, idx + 2000);
      break;
    }
  }

  for (const marker of qualMarkers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      qualifications = fullText.slice(idx, idx + 2000);
      break;
    }
  }

  return { fullText, responsibilities, qualifications };
}

export function countSignalMatches(text: string, signals: readonly string[]): number {
  const lower = text.toLowerCase();
  return signals.filter((s) => lower.includes(s.toLowerCase())).length;
}

export function containsAny(text: string, patterns: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}
