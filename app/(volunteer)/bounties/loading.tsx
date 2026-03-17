export default function BountiesLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="pt-2 space-y-3">
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="h-4 w-52 rounded bg-muted" />
        <div className="h-10 rounded-lg bg-muted md:hidden" />
      </div>
      {/* Tab bar skeleton */}
      <div className="h-10 rounded-lg bg-muted" />
      {/* Sort bar skeleton */}
      <div className="h-6 w-48 rounded bg-muted" />
      {/* Cards */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-48 rounded bg-muted" />
                <div className="h-5 w-14 rounded-full bg-muted" />
              </div>
              <div className="h-3.5 w-64 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
