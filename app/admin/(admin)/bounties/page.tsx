export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, RefreshCw } from "lucide-react";
import L, { t } from "@/lib/labels";
import { AdminBountyDeleteButton } from "@/components/admin/AdminBountyDeleteButton";

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

  const { data: bountiesRaw, count: totalCount } = await admin
    .from("user_bounties")
    .select(
      `id, title, reward_points, is_repeatable, status, created_at,
       creator:profiles!user_bounties_creator_id_fkey(full_name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const bounties = (bountiesRaw ?? []) as unknown as BountyRow[];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{L.bounty.adminTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(L.bounty.adminSubtitle, { count: totalCount ?? 0 })}
        </p>
      </div>

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
