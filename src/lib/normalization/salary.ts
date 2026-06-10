import { decodeHtmlEntities } from "@/lib/normalization/text";

export interface ExtractedSalary {
  min: number | null;
  max: number | null;
  currency: string;
}

const MIN_SALARY = 40_000;
const MAX_SALARY = 2_000_000;

function detectCurrency(text: string): string {
  if (/€|eur\b/i.test(text)) return "EUR";
  if (/£|gbp\b/i.test(text)) return "GBP";
  if (/cad\b|ca\$/i.test(text)) return "CAD";
  return "USD";
}

function parseAmountToken(token: string): number | null {
  const cleaned = token.replace(/,/g, "").trim();
  const kMatch = /^(\d+(?:\.\d+)?)\s*k$/i.exec(cleaned);
  if (kMatch) {
    const value = Math.round(parseFloat(kMatch[1]) * 1000);
    return value >= MIN_SALARY && value <= MAX_SALARY ? value : null;
  }

  const numMatch = /^(\d+(?:\.\d+)?)$/.exec(cleaned);
  if (!numMatch) return null;

  const raw = parseFloat(numMatch[1]);
  const value = raw >= 40 && raw < 1000 ? Math.round(raw * 1000) : Math.round(raw);
  return value >= MIN_SALARY && value <= MAX_SALARY ? value : null;
}

function amountsFromMatches(text: string): number[] {
  const amounts: number[] = [];
  const patterns = [
    /[$€£]\s*([\d,]+(?:\.\d+)?)\s*k?\b/gi,
    /\b([\d,]+)\s*k\s*(?:usd|eur|gbp|cad)?\b/gi,
    /\b(\d{2,3},\d{3})\b/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = parseAmountToken(match[1]);
      if (parsed != null) amounts.push(parsed);
    }
  }

  return amounts;
}

function toRange(amounts: number[], currency: string): ExtractedSalary {
  const unique = [...new Set(amounts)].sort((a, b) => a - b);
  if (unique.length === 0) {
    return { min: null, max: null, currency };
  }
  if (unique.length === 1) {
    return { min: unique[0], max: unique[0], currency };
  }

  return {
    min: unique[0],
    max: unique[unique.length - 1],
    currency,
  };
}

function extractFromGreenhousePayRange(html: string): ExtractedSalary | null {
  const block =
    html.match(/class=["']pay-range["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    html.match(/<div[^>]*pay-range[^>]*>([\s\S]*?)<\/div>/i)?.[1];

  if (!block) return null;

  const amounts = amountsFromMatches(block);
  if (amounts.length === 0) return null;

  return toRange(amounts, detectCurrency(block));
}

function extractFromGreenhousePayRangesField(raw: unknown): ExtractedSalary | null {
  if (!raw || typeof raw !== "object") return null;

  const ranges = (raw as { pay_ranges?: unknown }).pay_ranges;
  if (!Array.isArray(ranges) || ranges.length === 0) return null;

  const first = ranges[0] as {
    min?: number;
    max?: number;
    currency_type?: string;
    currency?: string;
  };

  const min = first.min ?? null;
  const max = first.max ?? null;
  if (min == null && max == null) return null;

  return {
    min,
    max: max ?? min,
    currency: first.currency_type ?? first.currency ?? "USD",
  };
}

function extractFromSalaryContext(text: string): ExtractedSalary | null {
  const lower = text.toLowerCase();
  const markers = [
    "pay range",
    "salary range",
    "base pay",
    "base salary",
    "compensation",
    "annual salary",
  ];

  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx < 0) continue;

    const window = text.slice(idx, idx + 600);
    const amounts = amountsFromMatches(window);
    if (amounts.length >= 1) {
      return toRange(amounts, detectCurrency(window));
    }
  }

  return null;
}

/** Parse listed salary from HTML or plain-text job content. */
export function extractSalaryFromText(text: string): ExtractedSalary {
  if (!text) {
    return { min: null, max: null, currency: "USD" };
  }

  const decoded = decodeHtmlEntities(text);
  const fromPayRange = extractFromGreenhousePayRange(decoded);
  if (fromPayRange?.min != null) return fromPayRange;

  const fromContext = extractFromSalaryContext(decoded);
  if (fromContext?.min != null) return fromContext;

  const amounts = amountsFromMatches(decoded);
  if (amounts.length >= 2) {
    return toRange(amounts, detectCurrency(decoded));
  }

  return { min: null, max: null, currency: detectCurrency(decoded) };
}

export function extractSalaryFromPosting(
  description: string,
  rawPayload?: unknown,
): ExtractedSalary {
  const fromField = extractFromGreenhousePayRangesField(rawPayload);
  if (fromField?.min != null) return fromField;

  const sources: string[] = [];
  if (rawPayload && typeof rawPayload === "object") {
    const raw = rawPayload as Record<string, unknown>;
    for (const key of ["content", "descriptionHtml", "descriptionPlain", "description"]) {
      if (typeof raw[key] === "string") sources.push(raw[key] as string);
    }
  }
  sources.push(description);

  for (const source of sources) {
    const extracted = extractSalaryFromText(source);
    if (extracted.min != null) return extracted;
  }

  return { min: null, max: null, currency: "USD" };
}
