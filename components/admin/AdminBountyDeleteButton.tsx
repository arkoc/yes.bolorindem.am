"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function AdminBountyDeleteButton({ bountyId, bountyTitle }: { bountyId: string; bountyTitle: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/bounties/${bountyId}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Չհաջողվեց ջնջել");
        return;
      }
      toast.success(data.refunded > 0 ? `Բոնուսը ջնջված է · ${data.refunded} մվր վերադարձվեց` : "Բոնուսը ջնջված է");
      router.refresh();
    } catch {
      toast.error("Չհաջողվեց ջնջել");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive truncate max-w-[140px]">Ջնջե՞լ «{bountyTitle}»</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirming(false)}>
          Ոչ
        </Button>
        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={handleDelete} disabled={deleting}>
          {deleting ? "..." : "Այո"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
