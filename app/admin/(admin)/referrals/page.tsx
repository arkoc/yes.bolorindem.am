import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Zap, ArrowRight } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import L, { t } from "@/lib/labels";

type ReferralRow = {
  id: string;
  full_name: string;
  created_at: string;
  referred_by: string | null;
  referrer: { full_name: string } | null;
};

type ReferrerStat = {
  id: string;
  full_name: string;
  referral_count: number;
  points_from_referrals: number;
};

export default async function AdminReferralsPage() {
  const supabase = createAdminClient();

  const [referralsRes, transactionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, created_at, referred_by")
      .not("referred_by", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("point_transactions")
      .select("user_id, amount")
      .eq("source_type", "referral"),
  ]);

  if (referralsRes.error) console.error("Referrals query error:", referralsRes.error);

  const rawReferrals = (referralsRes.data ?? []) as { id: string; full_name: string; created_at: string; referred_by: string }[];
  const transactions = transactionsRes.data ?? [];

  // Fetch referrer names in a single query
  const referrerIds = [...new Set(rawReferrals.map((r) => r.referred_by))];
  const { data: referrerProfiles } = referrerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", referrerIds)
    : { data: [] };
  const referrerMap = new Map((referrerProfiles ?? []).map((p) => [p.id, p.full_name]));

  const referrals: ReferralRow[] = rawReferrals.map((r) => ({
    ...r,
    referrer: referrerMap.has(r.referred_by) ? { full_name: referrerMap.get(r.referred_by)! } : null,
  }));

  // Build per-referrer stats
  const statsMap = new Map<string, ReferrerStat>();
  for (const r of referrals) {
    if (!r.referred_by) continue;
    if (!statsMap.has(r.referred_by)) {
      statsMap.set(r.referred_by, {
        id: r.referred_by,
        full_name: r.referrer?.full_name ?? "—",
        referral_count: 0,
        points_from_referrals: 0,
      });
    }
    statsMap.get(r.referred_by)!.referral_count += 1;
  }
  for (const tx of transactions) {
    const stat = statsMap.get(tx.user_id);
    if (stat) stat.points_from_referrals += tx.amount;
  }

  const topReferrers = Array.from(statsMap.values()).sort(
    (a, b) => b.referral_count - a.referral_count
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{L.admin.referrals.title}</h1>
        <p className="text-muted-foreground text-sm">
          {t(L.admin.referrals.subtitle, { count: referrals.length })}
        </p>
      </div>

      {/* Top referrers */}
      {topReferrers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {L.admin.referrals.topReferrers}
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {topReferrers.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-sm font-semibold text-muted-foreground w-5 text-center shrink-0">
                      {i + 1}
                    </span>
                    <UserAvatar name={r.full_name} size={36} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(L.admin.referrals.referralCount, { count: r.referral_count })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold shrink-0">
                      <Zap className="h-3.5 w-3.5 text-yellow-500" />
                      {formatPoints(r.points_from_referrals)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All referrals list */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {L.admin.referrals.allReferrals}
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <UserAvatar name={r.referrer?.full_name ?? "?"} size={32} className="shrink-0" />
                  <div className="text-sm font-medium min-w-0 truncate">
                    {r.referrer?.full_name ?? "—"}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <UserAvatar name={r.full_name} size={32} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("hy-AM")}
                    </p>
                  </div>
                </div>
              ))}
              {referrals.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {L.admin.referrals.empty}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
