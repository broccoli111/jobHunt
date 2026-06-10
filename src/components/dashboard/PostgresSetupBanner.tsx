"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";

const SETUP_STEPS = [
  "Vercel → your project → Storage → Create Postgres → Connect to this project",
  "Deployments → Redeploy (uncheck “Use existing build cache”)",
  "Click “Run database migration” below (runs on Vercel — no need to copy POSTGRES_URL)",
  "Click “Refresh jobs”",
];

interface PostgresSetupBannerProps {
  hint?: string;
  onMigrated?: () => void;
}

export function PostgresSetupBanner({ hint, onMigrated }: PostgresSetupBannerProps) {
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  const runMigration = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch("/api/migrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          [data.error, data.hint, data.message].filter(Boolean).join(" — ") ||
            "Migration failed",
        );
      }
      setMigrateResult(data.message ?? "Migration complete.");
      onMigrated?.();
    } catch (e) {
      setMigrateResult(e instanceof Error ? e.message : "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">Vercel Postgres setup</p>
      {hint && <p className="mt-1 text-amber-800">{hint}</p>}
      <p className="mt-2 text-amber-800">
        Jobs work in-memory until Postgres is connected and migrated.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-amber-900">
        {SETUP_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={runMigration} loading={migrating} variant="secondary">
          Run database migration
        </Button>
        {migrateResult && (
          <span className={migrateResult.includes("success") || migrateResult.includes("complete") ? "text-emerald-700" : "text-red-700"}>
            {migrateResult}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-amber-700">
        Migration runs on your Vercel deployment using the auto-injected POSTGRES_URL — you never
        need to copy it. Check status at <code className="rounded bg-amber-100 px-1">/api/health</code>.
      </p>
    </div>
  );
}
