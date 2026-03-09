export default function VotingLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 animate-pulse">
      <div className="pt-2 space-y-2">
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="h-4 w-52 rounded bg-muted" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
