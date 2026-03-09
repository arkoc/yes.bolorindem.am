export default function LeaderboardLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
      <div className="pt-2 space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>

      {/* My position skeleton */}
      <div className="h-16 rounded-xl bg-primary/10 border border-primary/20" />

      {/* List skeleton */}
      <div className="rounded-xl border overflow-hidden divide-y">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-5 w-5 rounded bg-muted shrink-0" />
            <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
