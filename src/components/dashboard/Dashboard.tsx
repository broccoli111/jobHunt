"use client";

import { JobDetailPanel } from "@/components/dashboard/JobDetailPanel";
import {
  DEFAULT_FILTERS,
  JobFilters,
  type FilterState,
} from "@/components/dashboard/JobFilters";
import { JobCardList } from "@/components/dashboard/JobCardList";
import { JobTable } from "@/components/dashboard/JobTable";
import { PostgresSetupBanner } from "@/components/dashboard/PostgresSetupBanner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { JobWithCompany } from "@/types";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.roleFocus.length) params.set("roleFocus", filters.roleFocus.join(","));
  if (filters.workMode.length) params.set("workMode", filters.workMode.join(","));
  if (filters.seniority.length) params.set("seniority", filters.seniority.join(","));
  if (filters.companyIds.length) params.set("companies", filters.companyIds.join(","));
  if (filters.salaryVisibility !== "all") params.set("salaryVisibility", filters.salaryVisibility);
  if (filters.publicOnly != null) params.set("publicOnly", String(filters.publicOnly));
  params.set("sortBy", "match_percentage");
  params.set("sortOrder", "desc");
  return params.toString();
}

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedJob, setSelectedJob] = useState<JobWithCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [storage, setStorage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/jobs?${buildQuery(filters)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = [data.error, data.hint].filter(Boolean).join(" — ");
          throw new Error(detail || "Failed to load jobs");
        }
        if (active) {
          setJobs(data.jobs ?? []);
          setLastRefreshed(data.lastRefreshedAt ?? null);
          setWarning(data.warning ?? null);
          setSetupHint(data.hint ?? null);
          setStorage(data.storage ?? null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadJobs();
    return () => {
      active = false;
    };
  }, [filters]);

  useEffect(() => {
    let active = true;

    async function loadCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok && active) {
          const data = await res.json();
          setCompanies(data.companies ?? []);
        }
      } catch {
        // non-critical
      }
    }

    void loadCompanies();
    return () => {
      active = false;
    };
  }, []);

  const reloadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?${buildQuery(filters)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = [data.error, data.hint].filter(Boolean).join(" — ");
        throw new Error(detail || "Failed to load jobs");
      }
      setJobs(data.jobs ?? []);
      setLastRefreshed(data.lastRefreshedAt ?? null);
      setWarning(data.warning ?? null);
      setSetupHint(data.hint ?? null);
      setStorage(data.storage ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Refresh failed");
      }
      await reloadJobs();
      const companiesRes = await fetch("/api/companies");
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">jobHunt</h1>
            <p className="mt-1 text-sm text-slate-500">
              Design systems &amp; IC design roles matched to your profile
            </p>
            {lastRefreshed && (
              <p className="mt-1 text-xs text-slate-400">
                Last refreshed: {format(new Date(lastRefreshed), "MMM d, yyyy h:mm a")}
              </p>
            )}
          </div>
          <Button onClick={handleRefresh} loading={refreshing} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh jobs
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
        <JobFilters filters={filters} companies={companies} onChange={setFilters} />

        {storage === "memory" && !error && (
          <PostgresSetupBanner
            hint={setupHint ?? warning ?? undefined}
            onMigrated={reloadJobs}
          />
        )}

        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={reloadJobs} />}
        {!loading && !error && jobs.length === 0 && (
          <EmptyState onRefresh={handleRefresh} refreshing={refreshing} />
        )}
        {!loading && !error && jobs.length > 0 && (
          <>
            <p className="text-sm text-slate-500">
              Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""} sorted by match %
            </p>
            <div className="md:hidden">
              <JobCardList jobs={jobs} onSelect={setSelectedJob} />
            </div>
            <div className="hidden md:block">
              <JobTable jobs={jobs} onSelect={setSelectedJob} />
            </div>
          </>
        )}
      </main>

      <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
