import { cn, formatPercent } from "@/lib/utils";

interface MatchScoreProps {
  percentage: number;
  size?: "sm" | "lg";
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600 bg-emerald-50 ring-emerald-200";
  if (pct >= 60) return "text-indigo-600 bg-indigo-50 ring-indigo-200";
  if (pct >= 40) return "text-amber-700 bg-amber-50 ring-amber-200";
  return "text-slate-500 bg-slate-50 ring-slate-200";
}

export function MatchScore({ percentage, size = "sm" }: MatchScoreProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold ring-1 ring-inset",
        scoreColor(percentage),
        size === "lg" ? "min-w-[4.5rem] px-3 py-2 text-xl" : "min-w-[3rem] px-2 py-1 text-sm",
      )}
    >
      {formatPercent(percentage)}
    </div>
  );
}
