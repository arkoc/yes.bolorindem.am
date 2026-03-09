export default function ProjectsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="pt-2 space-y-2">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>

      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="h-32 bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="h-3.5 w-64 rounded bg-muted" />
              <div className="h-2 rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
