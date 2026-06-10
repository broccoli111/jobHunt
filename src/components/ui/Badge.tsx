import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "muted" | "accent";
  className?: string;
}

const variants = {
  default: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  muted: "bg-slate-50 text-slate-500 ring-slate-100",
  accent: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
