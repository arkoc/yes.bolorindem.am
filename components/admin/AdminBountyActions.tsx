"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import L, { t } from "@/lib/labels";

interface AdminBountyActionsProps {
  bountyId: string;
  completionId: string;
  rewardPoints: number;
  completerName: string;
}

export function AdminBountyActions({ bountyId, completionId, rewardPoints, completerName }: AdminBountyActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bounties/${bountyId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(L.bounty.acceptFailed); return; }
      toast.success(t(L.bounty.acceptSuccess, { points: data.points ?? rewardPoints, name: completerName }));
      router.refresh();
    } catch { toast.error(L.bounty.acceptFailed); }
    finally { setLoading(false); }
  }

  async function handleRefund() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bounties/${bountyId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId }),
      });
      if (!res.ok) { toast.error(L.bounty.cancelFailed); return; }
      toast.success(L.bounty.disputeSuccess);
      router.refresh();
    } catch { toast.error(L.bounty.cancelFailed); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleAccept} disabled={loading}>
        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
        {L.bounty.adminDisputeResolveAccept}
      </Button>
      <Button size="sm" variant="outline" onClick={handleRefund} disabled={loading}>
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        {L.bounty.adminDisputeResolveRefund}
      </Button>
    </div>
  );
}
