export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
      <div className="pt-2">
        <div className="h-7 w-32 rounded bg-muted" />
      </div>

      {/* Profile card skeleton */}
      <div className="rounded-xl border p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-3.5 w-48 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Badges skeleton */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
