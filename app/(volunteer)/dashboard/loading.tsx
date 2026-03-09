export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* Hero card skeleton */}
      <div className="h-24 rounded-xl bg-primary/20" />

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Projects section skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Badges skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="flex gap-2 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 w-28 shrink-0 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
