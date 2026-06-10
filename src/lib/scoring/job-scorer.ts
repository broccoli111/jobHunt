import { CANDIDATE_PROFILE } from "@/config/candidate-profile";
import {
  containsAny,
  countSignalMatches,
  extractTextSections,
} from "@/lib/normalization/text";
import type { RoleFocus, ScoreBreakdown, Seniority, WorkMode } from "@/types";

const WEIGHTS = {
  designSystemsRelevance: 0.3,
  seniorityFit: 0.2,
  responsibilityOverlap: 0.25,
  evidenceStrength: 0.15,
  negativeSignals: 0.1,
} as const;

export interface JobScoreInput {
  title: string;
  description: string;
  location?: string;
  workMode?: WorkMode;
  remoteFilterActive?: boolean;
}

export function inferSeniority(title: string, description: string): Seniority {
  const text = `${title} ${description}`.toLowerCase();

  if (containsAny(text, ["director", "head of design", "vp of design", "vice president"])) {
    return "director";
  }
  if (containsAny(text, ["people manager", "manage a team of", "hiring manager"]) && !containsAny(text, ["individual contributor", "ic role", "hands-on"])) {
    return "manager";
  }
  if (containsAny(text, ["principal"])) return "principal";
  if (containsAny(text, ["staff designer", "staff product", " ic6", "ic6 ", "level 6"])) return "staff";
  if (containsAny(text, ["design lead", " lead,", " lead "]) && !containsAny(text, ["team lead"])) return "lead";
  if (containsAny(text, ["senior staff"])) return "staff";
  if (containsAny(text, ["senior", "sr."])) return "senior";
  if (containsAny(text, ["junior", "entry level", "associate", "intern"])) return "junior";
  if (containsAny(text, ["mid-level", "mid level", "ii,"])) return "mid";
  return "unknown";
}

export function inferRoleFocus(title: string, description: string): RoleFocus[] {
  const text = `${title} ${description}`.toLowerCase();
  const focuses: RoleFocus[] = [];

  for (const [focus, patterns] of Object.entries(CANDIDATE_PROFILE.roleFocusMapping)) {
    if (containsAny(text, patterns)) {
      focuses.push(focus as RoleFocus);
    }
  }

  if (focuses.length === 0 && containsAny(text, ["product designer", "product design"])) {
    focuses.push("product_design");
  }

  return focuses;
}

function scoreDesignSystemsRelevance(title: string, text: string): { score: number; note: string } {
  const combined = `${title} ${text}`.toLowerCase();
  const strong = countSignalMatches(combined, [...CANDIDATE_PROFILE.designSystemsSignals.strong]);
  const medium = countSignalMatches(combined, [...CANDIDATE_PROFILE.designSystemsSignals.medium]);

  if (strong >= 2) return { score: 100, note: "strong design systems focus" };
  if (strong === 1) return { score: 85, note: "explicit design systems mention" };
  if (medium >= 2) return { score: 65, note: "systems thinking / scalable UX focus" };
  if (medium === 1) return { score: 50, note: "partial systems relevance" };
  if (containsAny(combined, ["product design", "product designer", "ux design"])) {
    return { score: 35, note: "general product design without systems focus" };
  }
  return { score: 15, note: "low design systems relevance" };
}

function scoreSeniorityFit(title: string, text: string): { score: number; note: string } {
  const combined = `${title} ${text}`.toLowerCase();
  const seniority = inferSeniority(title, text);

  if (CANDIDATE_PROFILE.excludeManagerOnly) {
    const managerOnly =
      containsAny(combined, ["people manager", "manage a team", "direct reports"]) &&
      !containsAny(combined, ["individual contributor", "hands-on", "ic "]);
    if (managerOnly || seniority === "director" || seniority === "manager") {
      return { score: 10, note: "manager-only or director role (penalized)" };
    }
  }

  if (containsAny(combined, [...CANDIDATE_PROFILE.senioritySignals.strong])) {
    return { score: 95, note: `${seniority} level — strong seniority fit` };
  }
  if (containsAny(combined, [...CANDIDATE_PROFILE.senioritySignals.medium])) {
    return { score: 70, note: "senior scope with large responsibility" };
  }
  if (seniority === "junior" || seniority === "mid") {
    return { score: 15, note: "below target seniority" };
  }
  return { score: 50, note: "seniority unclear" };
}

function scoreResponsibilityOverlap(text: string): { score: number; matched: string[] } {
  const matched: string[] = [];
  let weightedHits = 0;
  let maxWeighted = 0;

  for (const dim of CANDIDATE_PROFILE.experienceDimensions) {
    maxWeighted += dim.weight;
    const hits = countSignalMatches(text, dim.signals);
    if (hits > 0) {
      matched.push(dim.label);
      weightedHits += Math.min(hits, 3) / 3 * dim.weight;
    }
  }

  const score = maxWeighted > 0 ? (weightedHits / maxWeighted) * 100 : 20;
  return { score: Math.min(100, score), matched };
}

function scoreEvidenceStrength(text: string, matched: string[]): { score: number; note: string } {
  const wordCount = text.split(/\s+/).length;
  const specificityMarkers = [
    "component",
    "governance",
    "accessibility",
    "documentation",
    "figma",
    "react",
    "tokens",
    "adoption",
    "migration",
    "wcag",
    "cross-functional",
    "engineering",
  ];
  const specificCount = countSignalMatches(text, specificityMarkers);

  if (wordCount < 80) {
    return { score: 25, note: "posting is very short / vague" };
  }
  if (specificCount >= 6 && matched.length >= 5) {
    return { score: 95, note: "rich, specific responsibilities map well to profile" };
  }
  if (specificCount >= 4 && matched.length >= 3) {
    return { score: 80, note: "good specificity in responsibilities" };
  }
  if (specificCount >= 2) {
    return { score: 60, note: "moderate detail in posting" };
  }
  return { score: 35, note: "generic posting with limited detail" };
}

function scoreNegativeSignals(
  title: string,
  text: string,
  workMode: WorkMode | undefined,
  remoteFilterActive: boolean,
): { score: number; penalties: string[] } {
  const combined = `${title} ${text}`.toLowerCase();
  const penalties: string[] = [];
  let penaltyTotal = 0;

  for (const signal of CANDIDATE_PROFILE.negativeSignals) {
    if (combined.includes(signal.pattern)) {
      penalties.push(signal.label);
      penaltyTotal += signal.penalty;
    }
  }

  if (remoteFilterActive && (workMode === "hybrid" || workMode === "in_office")) {
    penalties.push("not fully remote");
    penaltyTotal += 0.5;
  }

  // Score: 100 = no penalties, decreases with penalties (max ~5 penalties)
  const score = Math.max(0, 100 - penaltyTotal * 12);
  return { score, penalties };
}

export function scoreJob(input: JobScoreInput): ScoreBreakdown {
  const { fullText, responsibilities, qualifications } = extractTextSections(
    input.description,
  );
  const analysisText = `${input.title} ${fullText} ${responsibilities} ${qualifications}`;

  const ds = scoreDesignSystemsRelevance(input.title, analysisText);
  const sen = scoreSeniorityFit(input.title, analysisText);
  const resp = scoreResponsibilityOverlap(analysisText);
  const evidence = scoreEvidenceStrength(analysisText, resp.matched);
  const negative = scoreNegativeSignals(
    input.title,
    analysisText,
    input.workMode,
    input.remoteFilterActive ?? true,
  );

  const matchPercentage =
    ds.score * WEIGHTS.designSystemsRelevance +
    sen.score * WEIGHTS.seniorityFit +
    resp.score * WEIGHTS.responsibilityOverlap +
    evidence.score * WEIGHTS.evidenceStrength +
    negative.score * WEIGHTS.negativeSignals;

  const parts: string[] = [];

  if (ds.score >= 80) parts.push(`Strong match: ${ds.note}`);
  else if (ds.score >= 50) parts.push(`Moderate match: ${ds.note}`);
  else parts.push(`Weak systems fit: ${ds.note}`);

  parts.push(`${sen.note}`);

  if (resp.matched.length > 0) {
    parts.push(
      `Responsibility overlap: ${resp.matched.slice(0, 4).join(", ")}${resp.matched.length > 4 ? ", …" : ""}`,
    );
  }

  if (evidence.score < 50) parts.push(evidence.note);

  if (negative.penalties.length > 0) {
    parts.push(`Penalties: ${negative.penalties.join("; ")}`);
  }

  if (!input.description.toLowerCase().includes("salary") && !input.description.match(/\$\d+/)) {
    parts.push("Minor note: salary range unavailable");
  }

  return {
    designSystemsRelevance: Math.round(ds.score),
    seniorityFit: Math.round(sen.score),
    responsibilityOverlap: Math.round(resp.score),
    evidenceStrength: Math.round(evidence.score),
    negativeSignals: Math.round(negative.score),
    matchPercentage: Math.round(Math.min(100, Math.max(0, matchPercentage)) * 100) / 100,
    explanation: parts.join(". ") + ".",
  };
}

export function inferWorkMode(location: string, description: string): WorkMode {
  const text = `${location} ${description}`.toLowerCase();
  if (text.includes("remote") && !text.includes("hybrid") && !text.includes("on-site") && !text.includes("onsite")) {
    return "remote";
  }
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("on-site") || text.includes("onsite") || text.includes("in-office") || text.includes("in office")) {
    return "in_office";
  }
  if (text.includes("remote")) return "remote";
  return "unknown";
}
