export default function BountyCreateLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 animate-pulse">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-10 rounded-lg bg-muted" />
        </div>
      ))}
      <div className="h-11 rounded-lg bg-muted" />
    </div>
  );
}
