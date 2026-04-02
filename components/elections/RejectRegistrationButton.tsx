"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RejectRegistrationButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReject() {
    if (!confirm("Արձanagrum mechatve՞l")) return;
    setLoading(true);
    const res = await fetch("/api/admin/elections/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
    else { const j = await res.json().catch(() => ({})); alert(j.error ?? "Failed"); }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 gap-1.5"
      disabled={loading}
      onClick={handleReject}
    >
      <X className="h-3.5 w-3.5" />
      {loading ? "..." : "Մերժել"}
    </Button>
  );
}
