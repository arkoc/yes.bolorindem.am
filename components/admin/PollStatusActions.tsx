"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, XCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import L from "@/lib/labels";

interface Props {
  pollId: string;
  status: string;
}

export function PollStatusActions({ pollId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: string) {
    setLoading(action);
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        action === "publish" ? L.admin.voting.pollPublished : L.admin.voting.pollClosed
      );
      router.refresh();
    } catch {
      toast.error("Error");
    }
    setLoading(null);
  }

  async function handleDelete() {
    if (!window.confirm(L.admin.voting.pollDeleteConfirm)) return;
    setLoading("delete");
    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(L.admin.voting.pollDeleted);
      router.push("/admin/voting");
    } catch {
      toast.error(L.admin.voting.pollDeleteFailed);
    }
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === "draft" && (
        <Button onClick={() => handleAction("publish")} disabled={loading !== null}>
          {loading === "publish"
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Send className="h-4 w-4 mr-2" />
          }
          {L.admin.voting.publish}
        </Button>
      )}
      {status === "active" && (
        <Button variant="destructive" onClick={() => handleAction("close")} disabled={loading !== null}>
          {loading === "close"
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <XCircle className="h-4 w-4 mr-2" />
          }
          {L.admin.voting.close}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        onClick={handleDelete}
        disabled={loading !== null}
      >
        {loading === "delete"
          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
          : <Trash2 className="h-4 w-4 mr-2" />
        }
        {L.admin.voting.deletePoll}
      </Button>
    </div>
  );
}
