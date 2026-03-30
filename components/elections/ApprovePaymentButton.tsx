"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApprovePaymentButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    if (!confirm("Վճարումը հաստատե՞լ")) return;
    setLoading(true);
    const res = await fetch("/api/admin/elections/approve-payment", {
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
      className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700 gap-1.5"
      disabled={loading}
      onClick={handleApprove}
    >
      <Check className="h-3.5 w-3.5" />
      {loading ? "..." : "Հաստատել"}
    </Button>
  );
}
