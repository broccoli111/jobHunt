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
    .replace(/&apos;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"');
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

/** Remove common markdown formatting while keeping readable plain text. */
export function stripMarkdown(text: string): string {
  if (!text) return "";

  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normalize job posting text: decode entities, strip HTML, strip markdown. */
export function normalizeJobText(input: string): string {
  if (!input) return "";

  const hasHtml = /<\/?[a-z][\s\S]*?>/i.test(input);
  let text = hasHtml ? stripHtml(input) : decodeHtmlEntities(input);
  text = stripMarkdown(text);
  text = decodeHtmlEntities(text);

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const SECTION_MARKERS = [
  "responsibilities",
  "what you'll do",
  "what you will do",
  "the role",
  "qualifications",
  "requirements",
  "what you'll bring",
  "what you will bring",
  "what we're looking for",
  "about you",
  "pay range",
  "compensation",
  "benefits",
  "how to apply",
];

function findSectionStart(lower: string, markers: string[]): { index: number; marker: string } | null {
  let best: { index: number; marker: string } | null = null;

  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx < 0) continue;
    if (!best || idx < best.index) {
      best = { index: idx, marker };
    }
  }

  return best;
}

function extractSection(
  fullText: string,
  startMarkers: string[],
  boundaryMarkers: string[],
): string {
  const lower = fullText.toLowerCase();
  const start = findSectionStart(lower, startMarkers);
  if (!start) return "";

  let end = fullText.length;
  for (const marker of boundaryMarkers) {
    if (startMarkers.includes(marker)) continue;
    const idx = lower.indexOf(marker, start.index + start.marker.length);
    if (idx > start.index && idx < end) {
      end = idx;
    }
  }

  return fullText.slice(start.index, end).trim();
}

export function extractTextSections(description: string): {
  fullText: string;
  responsibilities: string;
  qualifications: string;
} {
  const fullText = normalizeJobText(description);

  const responsibilities = extractSection(
    fullText,
    ["responsibilities", "what you'll do", "what you will do", "the role"],
    SECTION_MARKERS,
  );

  const qualifications = extractSection(
    fullText,
    [
      "qualifications",
      "requirements",
      "what you'll bring",
      "what you will bring",
      "what we're looking for",
      "about you",
    ],
    SECTION_MARKERS,
  );

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
