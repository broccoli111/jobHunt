import type { Confidence, Seniority } from "@/types";

/**
 * Public compensation estimates based on commonly reported levels.
 * Sources: levels.fyi-style benchmarks (approximate). Replace with LEVELS_FYI_API_KEY when available.
 */

interface CompBenchmark {
  baseMin: number;
  baseMax: number;
  bonusPct: number;
  equityMin: number;
  equityMax: number;
  confidence: Confidence;
  source: string;
}

const PUBLIC_COMP_BENCHMARKS: Record<string, CompBenchmark> = {
  META: {
    baseMin: 185000,
    baseMax: 260000,
    bonusPct: 0.15,
    equityMin: 150000,
    equityMax: 400000,
    confidence: "high",
    source: "Public benchmarks (Staff+ IC design)",
  },
  GOOGL: {
    baseMin: 180000,
    baseMax: 250000,
    bonusPct: 0.15,
    equityMin: 120000,
    equityMax: 350000,
    confidence: "high",
    source: "Public benchmarks (Staff+ IC design)",
  },
  AAPL: {
    baseMin: 175000,
    baseMax: 240000,
    bonusPct: 0.12,
    equityMin: 100000,
    equityMax: 300000,
    confidence: "medium",
    source: "Estimated from public reports",
  },
  MSFT: {
    baseMin: 170000,
    baseMax: 245000,
    bonusPct: 0.2,
    equityMin: 100000,
    equityMax: 320000,
    confidence: "high",
    source: "Public benchmarks (Staff+ IC design)",
  },
  AMZN: {
    baseMin: 165000,
    baseMax: 235000,
    bonusPct: 0.1,
    equityMin: 80000,
    equityMax: 280000,
    confidence: "medium",
    source: "Estimated from public reports",
  },
  NFLX: {
    baseMin: 200000,
    baseMax: 350000,
    bonusPct: 0,
    equityMin: 150000,
    equityMax: 500000,
    confidence: "medium",
    source: "Estimated — Netflix cash-heavy comp",
  },
  ABNB: {
    baseMin: 170000,
    baseMax: 240000,
    bonusPct: 0.12,
    equityMin: 100000,
    equityMax: 300000,
    confidence: "medium",
    source: "Public benchmarks",
  },
  UBER: {
    baseMin: 165000,
    baseMax: 230000,
    bonusPct: 0.15,
    equityMin: 90000,
    equityMax: 280000,
    confidence: "medium",
    source: "Public benchmarks",
  },
  SHOP: {
    baseMin: 160000,
    baseMax: 225000,
    bonusPct: 0.1,
    equityMin: 80000,
    equityMax: 250000,
    confidence: "medium",
    source: "Public benchmarks",
  },
  DDOG: {
    baseMin: 165000,
    baseMax: 230000,
    bonusPct: 0.1,
    equityMin: 90000,
    equityMax: 260000,
    confidence: "medium",
    source: "Public benchmarks",
  },
  SNOW: {
    baseMin: 170000,
    baseMax: 240000,
    bonusPct: 0.1,
    equityMin: 100000,
    equityMax: 300000,
    confidence: "medium",
    source: "Public benchmarks",
  },
  FIGMA: {
    baseMin: 180000,
    baseMax: 260000,
    bonusPct: 0.1,
    equityMin: 120000,
    equityMax: 350000,
    confidence: "low",
    source: "Estimated private company benchmark",
  },
  STRIPE: {
    baseMin: 185000,
    baseMax: 270000,
    bonusPct: 0.1,
    equityMin: 150000,
    equityMax: 400000,
    confidence: "low",
    source: "Estimated private company benchmark",
  },
};

const SENIORITY_MULTIPLIER: Record<string, number> = {
  staff: 1.0,
  principal: 1.15,
  lead: 1.05,
  ic6: 1.0,
  senior: 0.85,
};

export function estimateCompensation(
  ticker: string | null,
  isPublic: boolean,
  seniority: Seniority | string | null,
): {
  baseMin: number | null;
  baseMax: number | null;
  bonusMin: number | null;
  bonusMax: number | null;
  equityMin: number | null;
  equityMax: number | null;
  totalCompMin: number | null;
  totalCompMax: number | null;
  confidence: Confidence | null;
  source: string;
} {
  if (!isPublic && !ticker) {
    const bench = ticker ? PUBLIC_COMP_BENCHMARKS[ticker] : null;
    if (!bench) {
      return {
        baseMin: null,
        baseMax: null,
        bonusMin: null,
        bonusMax: null,
        equityMin: null,
        equityMax: null,
        totalCompMin: null,
        totalCompMax: null,
        confidence: null,
        source: "Not enough public data",
      };
    }
  }

  const key = ticker?.toUpperCase() ?? "";
  const bench = PUBLIC_COMP_BENCHMARKS[key];

  if (!bench) {
    return {
      baseMin: null,
      baseMax: null,
      bonusMin: null,
      bonusMax: null,
      equityMin: null,
      equityMax: null,
      totalCompMin: null,
      totalCompMax: null,
      confidence: isPublic ? "low" : null,
      source: isPublic ? "Not enough public data" : "Private company — limited public comp data",
    };
  }

  const mult = SENIORITY_MULTIPLIER[seniority ?? "staff"] ?? 1.0;
  const baseMin = Math.round(bench.baseMin * mult);
  const baseMax = Math.round(bench.baseMax * mult);
  const bonusMin = Math.round(baseMin * bench.bonusPct * 0.8);
  const bonusMax = Math.round(baseMax * bench.bonusPct * 1.2);
  const equityMin = Math.round(bench.equityMin * mult);
  const equityMax = Math.round(bench.equityMax * mult);
  const totalCompMin = baseMin + bonusMin + equityMin;
  const totalCompMax = baseMax + bonusMax + equityMax;

  return {
    baseMin,
    baseMax,
    bonusMin,
    bonusMax,
    equityMin,
    equityMax,
    totalCompMin,
    totalCompMax,
    confidence: bench.confidence,
    source: bench.source,
  };
}

export function formatCompSummary(comp: ReturnType<typeof estimateCompensation>): string {
  if (comp.totalCompMin == null || comp.totalCompMax == null) {
    return comp.source;
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  return `${fmt(comp.totalCompMin)}–${fmt(comp.totalCompMax)} TC (${comp.confidence ?? "low"} confidence)`;
}
