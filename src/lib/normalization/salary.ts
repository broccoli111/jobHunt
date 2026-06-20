import { decodeHtmlEntities, normalizeJobText } from "@/lib/normalization/text";

export interface ExtractedSalary {
  min: number | null;
  max: number | null;
  currency: string;
}

const MIN_SALARY = 40_000;
const MAX_SALARY = 2_000_000;

/** Coerce API/parsed salary amounts to whole dollars for INTEGER database columns. */
export function normalizeSalaryAmount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_SALARY || rounded > MAX_SALARY) return null;
  return rounded;
}

function finalizeSalary(extracted: ExtractedSalary): ExtractedSalary {
  const min = normalizeSalaryAmount(extracted.min);
  const max = normalizeSalaryAmount(extracted.max);
  return {
    min,
    max: max ?? min,
    currency: extracted.currency,
  };
}

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

function prepareSalaryText(text: string): string {
  return normalizeJobText(text);
}

function amountsFromMatches(text: string): number[] {
  const amounts: number[] = [];
  const patterns = [
    /[$€£]\s*([\d,]+(?:\.\d+)?)\s*k?\b/gi,
    /\b([\d,]+)\s*k\s*(?:usd|eur|gbp|cad)?\b/gi,
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

function extractAdjacentSalaryRange(text: string): ExtractedSalary | null {
  const rangePattern =
    /[$€£]\s*([\d,]+(?:\.\d+)?)\s*k?\s*(?:usd|eur|gbp|cad)?\s*(?:—|–|-|\bto\b)\s*[$€£]?\s*([\d,]+(?:\.\d+)?)\s*k?\s*(usd|eur|gbp|cad)?/gi;

  let match: RegExpExecArray | null;
  let best: ExtractedSalary | null = null;

  while ((match = rangePattern.exec(text)) !== null) {
    const min = parseAmountToken(match[1]);
    const max = parseAmountToken(match[2]);
    if (min == null || max == null) continue;

    const candidate = {
      min: Math.min(min, max),
      max: Math.max(min, max),
      currency: (match[3] ?? detectCurrency(match[0])).toUpperCase(),
    };

    if (!best || (candidate.max ?? 0) > (best.max ?? 0)) {
      best = candidate;
    }
  }

  return best;
}

function toRange(amounts: number[], currency: string): ExtractedSalary {
  const unique = [...new Set(amounts.map((amount) => normalizeSalaryAmount(amount)).filter((amount): amount is number => amount != null))].sort((a, b) => a - b);
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

  const min = normalizeSalaryAmount(first.min);
  const max = normalizeSalaryAmount(first.max ?? first.min);
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
    "annual base salary",
    "base salary range",
    "pay range",
    "salary range",
    "base pay",
    "base salary",
    "target base salary",
    "annual salary",
    "compensation range",
  ];

  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx < 0) continue;

    const window = text.slice(idx, idx + 800);
    const adjacent = extractAdjacentSalaryRange(window);
    if (adjacent?.min != null) return adjacent;

    const amounts = amountsFromMatches(window).filter((amount) => amount >= MIN_SALARY);
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

  const normalized = prepareSalaryText(text);
  const fromPayRange = extractFromGreenhousePayRange(normalized);
  if (fromPayRange?.min != null) return finalizeSalary(fromPayRange);

  const adjacent = extractAdjacentSalaryRange(normalized);
  if (adjacent?.min != null) return finalizeSalary(adjacent);

  const fromContext = extractFromSalaryContext(normalized);
  if (fromContext?.min != null) return finalizeSalary(fromContext);

  const amounts = amountsFromMatches(normalized).filter((amount) => amount >= MIN_SALARY);
  if (amounts.length >= 2) {
    return finalizeSalary(toRange(amounts, detectCurrency(normalized)));
  }
  if (amounts.length === 1) {
    return finalizeSalary({
      min: amounts[0],
      max: amounts[0],
      currency: detectCurrency(normalized),
    });
  }

  return { min: null, max: null, currency: detectCurrency(normalized) };
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
  if (description) sources.push(description);

  for (const source of sources) {
    const decoded = decodeHtmlEntities(source);
    const fromPayRange = extractFromGreenhousePayRange(decoded);
    if (fromPayRange?.min != null) return finalizeSalary(fromPayRange);

    const extracted = extractSalaryFromText(source);
    if (extracted.min != null) return extracted;
  }

  return { min: null, max: null, currency: "USD" };
}
