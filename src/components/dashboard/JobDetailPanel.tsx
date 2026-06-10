"use client";

import { CompanyLogo } from "@/components/dashboard/CompanyLogo";
import { MatchScore } from "@/components/dashboard/MatchScore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { normalizeJobText } from "@/lib/normalization/text";
import {
  formatCurrency,
  formatJobSalaryDisplay,
  formatRoleFocus,
  formatSeniority,
  formatWorkMode,
} from "@/lib/utils";
import type { JobWithCompany } from "@/types";
import { ExternalLink, X } from "lucide-react";
import { format } from "date-fns";

interface JobDetailPanelProps {
  job: JobWithCompany | null;
  onClose: () => void;
}

export function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
  if (!job) return null;

  const comp = job.compensation;
  const stock = job.stock_price;
  const description = normalizeJobText(job.description ?? "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="flex gap-4">
            <CompanyLogo name={job.company.name} logoUrl={job.company.logo_url} size={48} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{job.title}</h2>
              <p className="text-sm text-slate-500">{job.company.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="accent">{formatWorkMode(job.work_mode)}</Badge>
                <Badge>{formatSeniority(job.seniority)}</Badge>
                {job.role_focus?.map((f) => (
                  <Badge key={f} variant="muted">
                    {formatRoleFocus(f)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <MatchScore percentage={job.match_percentage} size="lg" />
            <div>
              <p className="text-sm font-medium text-slate-900">Match score</p>
              <p className="text-sm text-slate-500">{job.match_explanation}</p>
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Compensation</h3>
            <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-1">
              <p>
                <span className="text-slate-500">Listed salary: </span>
                {formatJobSalaryDisplay(job)}
              </p>
              {comp?.total_comp_min != null ? (
                <>
                  <p>
                    <span className="text-slate-500">Est. base: </span>
                    {formatCurrency(comp.base_min)} – {formatCurrency(comp.base_max)}
                  </p>
                  <p>
                    <span className="text-slate-500">Est. bonus: </span>
                    {formatCurrency(comp.bonus_min)} – {formatCurrency(comp.bonus_max)}
                  </p>
                  <p>
                    <span className="text-slate-500">Est. equity: </span>
                    {formatCurrency(comp.equity_min)} – {formatCurrency(comp.equity_max)}
                  </p>
                  <p className="font-medium">
                    Total comp: {formatCurrency(comp.total_comp_min)} –{" "}
                    {formatCurrency(comp.total_comp_max)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {comp.confidence} confidence — {comp.source}
                  </p>
                </>
              ) : (
                <p className="text-slate-500">{comp?.source ?? "Not enough public data"}</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Stock</h3>
            <p className="text-sm text-slate-600">
              {!job.company.is_public
                ? "Private"
                : stock?.price != null
                  ? `${stock.ticker}: ${formatCurrency(stock.price, stock.currency)} (as of ${format(new Date(stock.fetched_at), "MMM d, yyyy")})`
                  : "Unavailable"}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Location</h3>
            <p className="text-sm text-slate-600">{job.location ?? "—"}</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Description</h3>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
              {description || "No description available."}
            </div>
          </section>

          {job.sources && job.sources.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Sources</h3>
              <ul className="space-y-2">
                {job.sources.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                    >
                      {s.source_name} <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="text-xs text-slate-400">
            <p>First seen: {format(new Date(job.first_seen_at), "MMM d, yyyy h:mm a")}</p>
            <p>Last updated: {format(new Date(job.last_seen_at), "MMM d, yyyy h:mm a")}</p>
          </section>
        </div>

        <div className="border-t border-slate-200 p-4">
          <a href={job.canonical_url} target="_blank" rel="noopener noreferrer">
            <Button className="w-full">
              View posting <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
