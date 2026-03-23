export default function TaskDetailLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 animate-pulse">
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="rounded-xl border p-4 space-y-3">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      <div className="rounded-xl border p-4 space-y-3">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
