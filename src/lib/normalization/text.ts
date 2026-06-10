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

function decodeHtmlEntitiesOnce(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

export function decodeHtmlEntities(text: string): string {
  let decoded = text;
  for (let i = 0; i < 3; i += 1) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

/** Strip HTML tags and decode entities; preserve paragraph breaks where possible. */
export function stripHtml(html: string): string {
  if (!html) return "";

  let text = decodeHtmlEntities(html);

  text = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text;
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
