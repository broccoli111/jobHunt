import { extractSalaryFromText } from "@/lib/normalization/salary";
import type { JobWithCompany } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "USD",
): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "USD",
): string {
  if (min == null && max == null) return "Not listed";
  if (min != null && max != null) {
    return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
  }
  if (min != null) return `${formatCurrency(min, currency)}+`;
  return `Up to ${formatCurrency(max!, currency)}`;
}

function getListedSalary(job: JobWithCompany): {
  min: number | null;
  max: number | null;
  currency: string;
} {
  if (job.salary_min != null || job.salary_max != null) {
    return {
      min: job.salary_min,
      max: job.salary_max,
      currency: job.salary_currency ?? "USD",
    };
  }

  const extracted = extractSalaryFromText(job.description ?? "");
  if (extracted.min != null) {
    return {
      min: extracted.min,
      max: extracted.max ?? extracted.min,
      currency: extracted.currency,
    };
  }

  return { min: null, max: null, currency: "USD" };
}

/** Listed posting salary, with estimated company comp as fallback. */
export function formatJobSalaryDisplay(job: JobWithCompany): string {
  const listedSalary = getListedSalary(job);
  const listed = formatSalaryRange(
    listedSalary.min,
    listedSalary.max,
    listedSalary.currency,
  );
  if (listed !== "Not listed") return listed;

  const comp = job.compensation;
  if (comp?.total_comp_min != null && comp?.total_comp_max != null) {
    return `Est. ${formatCurrency(comp.total_comp_min)} – ${formatCurrency(comp.total_comp_max)}`;
  }
  if (comp?.base_min != null && comp?.base_max != null) {
    return `Est. ${formatCurrency(comp.base_min)} – ${formatCurrency(comp.base_max)}`;
  }

  return "Not listed";
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatWorkMode(mode: string): string {
  switch (mode) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "in_office":
      return "In-office";
    default:
      return "Unknown";
  }
}

export function formatSeniority(seniority: string | null): string {
  if (!seniority) return "—";
  const map: Record<string, string> = {
    ic6: "IC6",
    staff: "Staff",
    principal: "Principal",
    lead: "Lead",
    senior: "Senior",
    manager: "Manager",
    director: "Director",
    junior: "Junior",
    mid: "Mid",
    unknown: "—",
  };
  return map[seniority] ?? seniority;
}

export function formatRoleFocus(focus: string): string {
  return focus
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
