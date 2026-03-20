"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import L from "@/lib/labels";

export function CancelRegistrationButton({ type }: { type: "voter" | "candidate" }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/elections/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {L.elections.cancelRefundNote}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={loading}
            onClick={handleCancel}
          >
            {loading ? "..." : L.elections.cancelConfirmBtn}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={loading}
            onClick={() => setConfirming(false)}
          >
            {L.elections.cancelAbortBtn}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-muted-foreground hover:text-destructive w-full mt-1"
      onClick={() => setConfirming(true)}
    >
      {L.elections.cancelBtn}
    </Button>
  );
}
