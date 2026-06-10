"use client";

const SETUP_STEPS = [
  "Vercel → your project → Storage → Create Postgres → Connect to this project",
  "Open the database → Query tab → paste & run db/migrations/001_initial_schema.sql",
  "Settings → Environment Variables → confirm POSTGRES_URL is listed",
  "Deployments → Redeploy (uncheck “Use existing build cache”)",
  "Return here → click Refresh jobs",
];

export function PostgresSetupBanner({ hint }: { hint?: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">Vercel Postgres not connected yet</p>
      {hint && <p className="mt-1 text-amber-800">{hint}</p>}
      <p className="mt-2 text-amber-800">
        Jobs work in-memory until Postgres is connected — data will not persist across redeploys.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-amber-900">
        {SETUP_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-amber-700">
        Debug: open <code className="rounded bg-amber-100 px-1">/api/health</code> on your
        deployed site to see whether POSTGRES_URL is visible to the app.
      </p>
    </div>
  );
}
