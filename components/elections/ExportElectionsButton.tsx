"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportElectionsButton({ type }: { type?: "voter" | "candidate" }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const url = `/api/admin/elections/export${type ? `?type=${type}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) { setLoading(false); return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+?)"/)?.[1] ?? "elections.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    setLoading(false);
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={handleExport} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {loading ? "..." : type === "voter" ? "Միայն Ընտրողներ" : type === "candidate" ? "Միայն Թեկնածուներ" : "Բոլորը"}
    </Button>
  );
}
