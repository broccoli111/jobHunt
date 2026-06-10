export function LoadingState({ message = "Loading jobs…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-500">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
