"use client";

import type { RoleFocus, WorkMode } from "@/types";

export interface FilterState {
  roleFocus: RoleFocus[];
  workMode: WorkMode[];
  seniority: string[];
  companyIds: string[];
  salaryVisibility: "has_salary" | "no_salary" | "all";
  publicOnly: boolean | null;
}

export const DEFAULT_FILTERS: FilterState = {
  roleFocus: ["design_systems", "product_design"],
  workMode: ["remote", "hybrid"],
  seniority: ["ic6", "staff", "principal", "lead", "senior"],
  companyIds: [],
  salaryVisibility: "all",
  publicOnly: null,
};

const ROLE_FOCUS_OPTIONS: { value: RoleFocus; label: string }[] = [
  { value: "design_systems", label: "Design Systems" },
  { value: "product_design", label: "Product Design" },
  { value: "platform_design", label: "Platform Design" },
  { value: "ai_product_design", label: "AI Product Design" },
  { value: "ux_infrastructure", label: "UX Infrastructure" },
  { value: "design_tooling", label: "Design Tooling" },
  { value: "accessibility", label: "Accessibility" },
];

const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "in_office", label: "In-office" },
];

const SENIORITY_OPTIONS = [
  { value: "ic6", label: "IC6" },
  { value: "staff", label: "Staff" },
  { value: "principal", label: "Principal" },
  { value: "lead", label: "Lead" },
  { value: "senior", label: "Senior" },
];

interface JobFiltersProps {
  filters: FilterState;
  companies: Array<{ id: string; name: string }>;
  onChange: (filters: FilterState) => void;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function JobFilters({ filters, companies, onChange }: JobFiltersProps) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Role focus</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...filters, roleFocus: toggle(filters.roleFocus, opt.value) })}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                filters.roleFocus.includes(opt.value)
                  ? "bg-indigo-600 text-white ring-indigo-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Work mode</p>
          <div className="flex flex-wrap gap-2">
            {WORK_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, workMode: toggle(filters.workMode, opt.value) })}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                  filters.workMode.includes(opt.value)
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Seniority</p>
          <div className="flex flex-wrap gap-2">
            {SENIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, seniority: toggle(filters.seniority, opt.value) })}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                  filters.seniority.includes(opt.value)
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Company
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={filters.companyIds[0] ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                companyIds: e.target.value ? [e.target.value] : [],
              })
            }
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Salary
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={filters.salaryVisibility}
              onChange={(e) =>
                onChange({
                  ...filters,
                  salaryVisibility: e.target.value as FilterState["salaryVisibility"],
                })
              }
            >
              <option value="all">All</option>
              <option value="has_salary">Has salary</option>
              <option value="no_salary">No salary listed</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company type
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={filters.publicOnly === null ? "" : filters.publicOnly ? "public" : "private"}
              onChange={(e) =>
                onChange({
                  ...filters,
                  publicOnly:
                    e.target.value === "" ? null : e.target.value === "public",
                })
              }
            >
              <option value="">All</option>
              <option value="public">Public only</option>
              <option value="private">Private only</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
