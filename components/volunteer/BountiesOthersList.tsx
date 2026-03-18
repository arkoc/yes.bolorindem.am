"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, ArrowRight, Repeat2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import L from "@/lib/labels";

const PAGE_SIZE = 20;

type BountyItem = {
  id: string;
  title: string;
  description: string | null;
  reward_points: number;
  is_repeatable: boolean;
  max_completions: number | null;
  status: string;
  created_at: string;
  creator: { full_name: string } | null;
  completions: { status: string }[];
};

type SortKey = "reward" | "newest";

interface Props {
  initialBounties: BountyItem[];
  initialHasMore: boolean;
  excludeUserId: string;
}

export function BountiesOthersList({ initialBounties, initialHasMore, excludeUserId }: Props) {
  const [bounties, setBounties] = useState<BountyItem[]>(initialBounties);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState<SortKey>("reward");
  const [loading, setLoading] = useState(false);

  async function fetchBounties(sortKey: SortKey, offset: number): Promise<{ items: BountyItem[]; hasMore: boolean }> {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_bounties")
      .select("id, title, description, reward_points, is_repeatable, max_completions, status, created_at, creator:profiles!user_bounties_creator_id_fkey(full_name), completions:bounty_completions(status)")
      .eq("status", "open")
      .neq("creator_id", excludeUserId)
      .order(sortKey === "reward" ? "reward_points" : "created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE); // +1 over PAGE_SIZE-1 to detect hasMore
    const raw = (data ?? []) as unknown as BountyItem[];
    return { items: raw.slice(0, PAGE_SIZE), hasMore: raw.length > PAGE_SIZE };
  }

  async function handleSortChange(newSort: SortKey) {
    if (newSort === sort) return;
    setSort(newSort);
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("user_bounties")
      .select("id, title, description, reward_points, is_repeatable, max_completions, status, created_at, creator:profiles!user_bounties_creator_id_fkey(full_name), completions:bounty_completions(status)")
      .eq("status", "open")
      .neq("creator_id", excludeUserId)
      .order(newSort === "reward" ? "reward_points" : "created_at", { ascending: false })
      .range(0, PAGE_SIZE);
    const items = (data ?? []) as unknown as BountyItem[];
    setBounties(items.slice(0, PAGE_SIZE));
    setHasMore(items.length > PAGE_SIZE);
    setLoading(false);
  }

  async function handleLoadMore() {
    setLoading(true);
    const { items, hasMore: more } = await fetchBounties(sort, bounties.length);
    setBounties((prev) => [...prev, ...items.slice(0, PAGE_SIZE)]);
    setHasMore(more);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Sort control */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Դասավորել՝</span>
        <div className="flex gap-1">
          {(["reward", "newest"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => handleSortChange(key)}
              className={`text-xs px-4 py-2 rounded-full border transition-colors min-h-[44px] flex items-center ${
                sort === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "reward" ? L.bounty.sortByReward : L.bounty.sortByNewest}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {bounties.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{L.bounty.noOpenBounties}</p>
      ) : (
        <div className="space-y-3">
          {bounties.map((b) => {
            const acceptedCount = b.completions?.filter(c => c.status === "accepted" || c.status === "disputed").length ?? 0;
            return (
            <Link key={b.id} href={`/bounties/${b.id}`} className="block">
              <Card className="hover:shadow-md transition-all active:scale-[0.99] cursor-pointer border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{b.title}</CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {b.is_repeatable ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Repeat2 className="h-3 w-3" />
                          {acceptedCount}/{b.max_completions ?? "∞"}
                        </Badge>
                      ) : acceptedCount > 0 ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Repeat2 className="h-3 w-3" />
                          {acceptedCount}
                        </Badge>
                      ) : null}
                      <Badge variant="success" className="text-xs">+{b.reward_points}</Badge>
                    </div>
                  </div>
                  {b.description && (
                    <CardDescription className="text-sm line-clamp-2">{b.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {L.bounty.bountyLabel} · {b.creator?.full_name}
                    </span>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="text-xs font-semibold">{L.volunteer.dashboard.startBtn}</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );})}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? "..." : L.bounty.loadMore}
        </Button>
      )}
    </div>
  );
}
