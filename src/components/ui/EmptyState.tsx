import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function EmptyState({ onRefresh, refreshing }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-slate-100 p-4 text-3xl">🔍</div>
      <h3 className="text-lg font-semibold text-slate-900">No matching jobs yet</h3>
      <p className="max-w-md text-sm text-slate-500">
        Run a refresh to ingest design roles from company career pages and job boards.
        Default filters show remote roles at Staff+ seniority with design systems focus.
      </p>
      {onRefresh && (
        <Button onClick={onRefresh} loading={refreshing}>
          Refresh job data
        </Button>
      )}
    </div>
  );
}
