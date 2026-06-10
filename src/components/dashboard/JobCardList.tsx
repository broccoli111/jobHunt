"use client";

import type { ReactNode } from "react";
import { CompanyLogo } from "@/components/dashboard/CompanyLogo";
import { MatchScore } from "@/components/dashboard/MatchScore";
import { Badge } from "@/components/ui/Badge";
import { formatCompSummary } from "@/lib/compensation/estimator";
import {
  formatCurrency,
  formatRoleFocus,
  formatSalaryRange,
  formatSeniority,
  formatWorkMode,
} from "@/lib/utils";
import type { JobWithCompany } from "@/types";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface JobCardListProps {
  jobs: JobWithCompany[];
  onSelect: (job: JobWithCompany) => void;
}

function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}

export function JobCardList({ jobs, onSelect }: JobCardListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => (
        <li key={job.id}>
          <article
            onClick={() => onSelect(job)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(job);
              }
            }}
            role="button"
            tabIndex={0}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30 active:bg-indigo-50/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <CompanyLogo name={job.company.name} logoUrl={job.company.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{job.company.name}</p>
                  <h3 className="mt-1 text-base font-medium leading-snug text-slate-900">
                    {job.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{formatSeniority(job.seniority)}</Badge>
                    {job.role_focus?.map((f) => (
                      <Badge key={f} variant="muted">
                        {formatRoleFocus(f)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <MatchScore percentage={job.match_percentage} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <CardField label="Salary">
                {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency ?? "USD")}
              </CardField>
              <CardField label="Work mode">
                <Badge
                  variant={
                    job.work_mode === "remote"
                      ? "success"
                      : job.work_mode === "hybrid"
                        ? "warning"
                        : "default"
                  }
                >
                  {formatWorkMode(job.work_mode)}
                </Badge>
              </CardField>
              <CardField label="Location">
                <span className="break-words">{job.location ?? "—"}</span>
              </CardField>
              <CardField label="Stock">
                {!job.company.is_public
                  ? "Private"
                  : job.stock_price?.price != null
                    ? formatCurrency(job.stock_price.price, job.stock_price.currency)
                    : "Unavailable"}
              </CardField>
            </dl>

            <div className="mt-3">
              <CardField label="Compensation details">
                {job.compensation
                  ? formatCompSummary({
                      baseMin: job.compensation.base_min,
                      baseMax: job.compensation.base_max,
                      bonusMin: job.compensation.bonus_min,
                      bonusMax: job.compensation.bonus_max,
                      equityMin: job.compensation.equity_min,
                      equityMax: job.compensation.equity_max,
                      totalCompMin: job.compensation.total_comp_min,
                      totalCompMax: job.compensation.total_comp_max,
                      confidence: job.compensation.confidence,
                      source: job.compensation.source ?? "",
                    })
                  : "Not enough public data"}
              </CardField>
            </div>

            {job.match_explanation && (
              <div className="mt-3">
                <CardField label="Match">
                  <span className="text-xs leading-relaxed text-slate-500">
                    {job.match_explanation}
                  </span>
                </CardField>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400">
                Updated {format(new Date(job.last_seen_at), "MMM d, yyyy")}
              </p>
              <a
                href={job.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                View posting
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
