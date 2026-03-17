export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, AlertCircle, RefreshCw } from "lucide-react";
import L, { t } from "@/lib/labels";
import { AdminBountyActions } from "@/components/admin/AdminBountyActions";
import { AdminBountyDeleteButton } from "@/components/admin/AdminBountyDeleteButton";

type CompletionRow = {
  id: string;
  bounty_id: string;
  user_id: string;
  proof_url: string;
  status: string;
  created_at: string;
  bounty: {
    id: string;
    title: string;
    description: string;
    reward_points: number;
    creator_id: string;
    is_repeatable: boolean;
    creator: { full_name: string } | null;
  } | null;
  completer: { full_name: string } | null;
};

type BountyRow = {
  id: string;
  title: string;
  reward_points: number;
  is_repeatable: boolean;
  status: string;
  created_at: string;
  creator: { full_name: string } | null;
};

const BOUNTY_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  open: "default",
  closed: "secondary",
  cancelled: "destructive",
};

export default async function AdminBountiesPage() {
  const admin = createAdminClient();

  const [{ data: disputedRaw }, { data: bountiesRaw, count: totalCount }] = await Promise.all([
    admin
      .from("bounty_completions")
      .select(
        `id, bounty_id, user_id, proof_url, status, created_at,
         bounty:user_bounties!bounty_completions_bounty_id_fkey(id, title, description, reward_points, creator_id, is_repeatable, creator:profiles!user_bounties_creator_id_fkey(full_name)),
         completer:profiles!bounty_completions_user_id_fkey(full_name)`,
        { count: "exact" }
      )
      .eq("status", "disputed")
      .order("created_at", { ascending: false }),
    admin
      .from("user_bounties")
      .select(
        `id, title, reward_points, is_repeatable, status, created_at,
         creator:profiles!user_bounties_creator_id_fkey(full_name)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const disputed = (disputedRaw ?? []) as unknown as CompletionRow[];
  const bounties = (bountiesRaw ?? []) as unknown as BountyRow[];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{L.bounty.adminTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(L.bounty.adminSubtitle, { count: totalCount ?? 0 })}
        </p>
      </div>

      {/* Disputed completions — need action */}
      {disputed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-destructive uppercase tracking-wide flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {L.bounty.statusDisputed} ({disputed.length})
          </h2>
          {disputed.map(c => (
            <Card key={c.id} className="border-l-4 border-l-destructive">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{c.bounty?.title ?? "—"}</CardTitle>
                  <Badge variant="destructive" className="shrink-0">{L.bounty.statusDisputed}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Creator</span>
                  {c.bounty && (
                    <Link href={`/profile/${c.bounty.creator_id}`} className="font-medium hover:underline">
                      {c.bounty.creator?.full_name ?? "—"}
                    </Link>
                  )}
                  <span className="text-muted-foreground">Completer</span>
                  <Link href={`/profile/${c.user_id}`} className="font-medium hover:underline">
                    {c.completer?.full_name ?? "—"}
                  </Link>
                  <span className="text-muted-foreground">Reward</span>
                  <span className="font-medium text-yellow-600">{c.bounty?.reward_points ?? 0} pts</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.proof_url} alt="Proof" className="w-full max-h-48 object-cover rounded-lg" />
                {c.bounty && (
                  <AdminBountyActions
                    bountyId={c.bounty_id}
                    completionId={c.id}
                    rewardPoints={c.bounty.reward_points}
                    completerName={c.completer?.full_name ?? ""}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* All bounties */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5" />
          {L.bounty.adminTitle}
        </h2>
        {bounties.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Բոնուսներ չկան</CardContent></Card>
        ) : (
          bounties.map(b => (
            <Card key={b.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-1.5">
                      {b.is_repeatable && <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" />}
                      {b.title}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span>{b.creator?.full_name}</span>
                      <span className="text-yellow-600 font-medium">{b.reward_points} pts</span>
                      <span>{new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={BOUNTY_VARIANTS[b.status] ?? "secondary"} className="mt-0.5">
                      {b.status}
                    </Badge>
                    <AdminBountyDeleteButton bountyId={b.id} bountyTitle={b.title} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
