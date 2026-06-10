import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-red-50 p-4 text-3xl">⚠️</div>
      <h3 className="text-lg font-semibold text-slate-900">Something went wrong</h3>
      <p className="max-w-md text-sm text-red-600">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
