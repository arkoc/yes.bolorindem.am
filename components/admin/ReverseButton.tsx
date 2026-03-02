"use client";

import L, { t } from "@/lib/labels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, RotateCcw } from "lucide-react";

interface ReverseButtonProps {
  completionId: string;
  points: number;
}

export function ReverseButton({ completionId, points }: ReverseButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleReverse() {
    if (!confirm(t(L.reverseButton.confirm, { points }))) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("task_completions")
      .update({
        status: "reversed",
        reversed_by: user?.id,
        reversed_at: new Date().toISOString(),
      })
      .eq("id", completionId);

    if (error) {
      toast.error(L.reverseButton.toastFailed);
    } else {
      toast.success(t(L.reverseButton.toastSuccess, { points }));
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
      onClick={handleReverse}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      {L.reverseButton.label}
    </Button>
  );
}
