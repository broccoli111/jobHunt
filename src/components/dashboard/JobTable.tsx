"use client";

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
  truncate,
} from "@/lib/utils";
import type { JobWithCompany } from "@/types";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface JobTableProps {
  jobs: JobWithCompany[];
  onSelect: (job: JobWithCompany) => void;
}

export function JobTable({ jobs, onSelect }: JobTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Company</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left font-semibold text-slate-600">Salary</th>
            <th className="hidden md:table-cell px-4 py-3 text-left font-semibold text-slate-600">Location</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Mode</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Match</th>
            <th className="hidden xl:table-cell px-4 py-3 text-left font-semibold text-slate-600">Details</th>
            <th className="hidden xl:table-cell px-4 py-3 text-left font-semibold text-slate-600">Stock</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onSelect(job)}
              className="cursor-pointer transition hover:bg-indigo-50/40"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <CompanyLogo name={job.company.name} logoUrl={job.company.logo_url} />
                  <span className="font-medium text-slate-900">{job.company.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{job.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge>{formatSeniority(job.seniority)}</Badge>
                    {job.role_focus?.slice(0, 2).map((f) => (
                      <Badge key={f} variant="muted">
                        {formatRoleFocus(f)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </td>
              <td className="hidden lg:table-cell px-4 py-3 text-slate-600">
                {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency ?? "USD")}
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-slate-600 max-w-[10rem]">
                {truncate(job.location ?? "—", 40)}
              </td>
              <td className="px-4 py-3">
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
              </td>
              <td className="px-4 py-3">
                <MatchScore percentage={job.match_percentage} />
              </td>
              <td className="hidden xl:table-cell px-4 py-3 text-xs text-slate-500 max-w-[14rem]">
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
              </td>
              <td className="hidden xl:table-cell px-4 py-3 text-slate-600">
                {!job.company.is_public
                  ? "Private"
                  : job.stock_price?.price != null
                    ? formatCurrency(job.stock_price.price, job.stock_price.currency)
                    : "Unavailable"}
              </td>
              <td className="px-4 py-3">
                <a
                  href={job.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <p className="mt-1 text-xs text-slate-400">
                  {format(new Date(job.last_seen_at), "MMM d")}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
