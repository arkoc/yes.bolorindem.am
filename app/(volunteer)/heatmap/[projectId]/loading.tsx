export default function HeatmapLoading() {
  return (
    <div
      style={{ width: "100%", height: "100dvh" }}
      className="bg-muted animate-pulse flex items-center justify-center"
    >
      <div className="text-muted-foreground text-sm">Բեռնվում է...</div>
    </div>
  );
}
