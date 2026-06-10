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
