"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Vote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import L from "@/lib/labels";

interface Option {
  id: string;
  text: string;
}

interface Props {
  pollId: string;
  options: Option[];
  allowMultiple: boolean;
}

export function PollVoteForm({ pollId, options, allowMultiple }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    if (allowMultiple) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
    } else {
      setSelected(new Set([id]));
    }
  }

  async function handleVote() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_voted") {
          toast.error(L.volunteer.voting.alreadyVoted);
        } else if (data.error === "poll_closed") {
          toast.error(L.volunteer.voting.pollClosed);
        } else if (data.error === "poll_expired") {
          toast.error(L.volunteer.voting.pollExpired);
        } else {
          toast.error(L.volunteer.voting.voteError);
        }
        return;
      }
      toast.success(L.volunteer.voting.voteSuccess);
      router.refresh();
    } catch {
      toast.error(L.volunteer.voting.voteError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {allowMultiple && (
        <p className="text-xs text-muted-foreground">{L.volunteer.voting.multiHint}</p>
      )}

      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                  allowMultiple ? "rounded-sm" : "rounded-full",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                )}>
                  {isSelected && (
                    <div className={cn(
                      "bg-white",
                      allowMultiple ? "h-2 w-2 rounded-sm" : "h-1.5 w-1.5 rounded-full"
                    )} />
                  )}
                </div>
                {opt.text}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleVote}
        disabled={loading || selected.size === 0}
        className="w-full"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
          : <Vote className="h-4 w-4 mr-2" />
        }
        {L.volunteer.voting.voteBtn}
      </Button>
    </div>
  );
}
