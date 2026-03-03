import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/volunteer/SignOutButton";
import { Trophy, Zap, CheckCircle, Star, Settings, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";
import { BadgeIcon } from "@/components/ui/badge-icon";

// Thresholds must stay in sync with check_and_award_badges() in SQL migrations.
// isRank = progress is the user's leaderboard rank (shown as "#N", not a bar)
const BADGE_REQS: Record<string, { max: number; isRank?: true }> = {
  "first-step":        { max: 1 },
  "activist":          { max: 10 },
  "political-machine": { max: 50 },
  "indefatigable":     { max: 100 },
  "paper-pusher":      { max: 20 },
  "terrain-master":    { max: 20 },
  "eyewitness":        { max: 15 },
  "novice":            { max: 100 },
  "reliable":          { max: 500 },
  "political-giant":   { max: 5000 },
  "podium":            { max: 3, isRank: true },
  "first-mission":     { max: 1 },
  "veteran":           { max: 5 },
};

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, rankRes, statsRes, allBadgesRes, userBadgesRes, progressRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, total_points, role, created_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("leaderboard")
      .select("rank, total_completions")
      .eq("id", user.id)
      .single(),
    supabase
      .from("point_transactions")
      .select("amount, source_type, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("badges")
      .select("id, name_hy, description_hy, icon, image_url, sort_order")
      .order("sort_order"),
    supabase
      .from("user_badges")
      .select("badge_id, awarded_at")
      .eq("user_id", user.id),
    supabase.rpc("get_badge_progress", { p_user_id: user.id }),
  ]);

  const profile = profileRes.data;
  const rank = rankRes.data;
  const transactions = statsRes.data ?? [];
  const allBadges = allBadgesRes.data ?? [];
  const earnedIds = new Set((userBadgesRes.data ?? []).map((b) => b.badge_id));

  // Badge progress stats — null-safe if migration not yet applied
  const bp = progressRes.data?.[0];
  const totalCompletions = Number(rank?.total_completions ?? 0);
  const totalPoints = profile?.total_points ?? 0;
  const currentRank = rank?.rank ? Number(rank.rank) : null;
  const formCount = Number(bp?.form_completions ?? 0);
  const locationCount = Number(bp?.location_completions ?? 0);
  const photoCount = Number(bp?.photo_completions ?? 0);
  const projectCount = Number(bp?.project_completions ?? 0);

  // Maps each badge ID to the user's current progress value
  const badgeCurrent: Record<string, number> = {
    "first-step":        totalCompletions,
    "activist":          totalCompletions,
    "political-machine": totalCompletions,
    "indefatigable":     totalCompletions,
    "paper-pusher":      formCount,
    "terrain-master":    locationCount,
    "eyewitness":        photoCount,
    "novice":            totalPoints,
    "reliable":          totalPoints,
    "political-giant":   totalPoints,
    "podium":            currentRank ?? 0,
    "first-mission":     projectCount,
    "veteran":           projectCount,
  };

  if (!profile) redirect("/register");

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{L.volunteer.profile.title}</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} size={80} className="shrink-0" />
            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="text-muted-foreground text-sm">{profile.phone}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={profile.role === "admin" ? "default" : profile.role === "leader" ? "secondary" : "outline"}>
                  {profile.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  since {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Zap className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold truncate">{formatPoints(profile.total_points)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{L.volunteer.profile.statPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold truncate">{rank?.rank ? getRankSuffix(Number(rank.rank)) : "—"}</p>
            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{L.volunteer.profile.statRank}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold truncate">{rank?.total_completions ?? 0}</p>
            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{L.volunteer.profile.statTasksDone}</p>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      {allBadges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                {L.volunteer.profile.badgesTitle}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {t(L.volunteer.profile.badgesEarned, { count: earnedIds.size })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2">
              {allBadges.map((badge: { id: string; name_hy: string; description_hy: string; icon: string; image_url: string | null }) => {
                const earned = earnedIds.has(badge.id);
                const req = BADGE_REQS[badge.id];
                const current = badgeCurrent[badge.id] ?? 0;
                const pct = req && !req.isRank
                  ? Math.min(100, (current / req.max) * 100)
                  : 0;

                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center",
                      earned
                        ? "bg-primary/10 border-primary/20"
                        : "opacity-50 bg-muted border-transparent"
                    )}
                  >
                    <BadgeIcon src={badge.image_url} fallback={badge.icon} alt={badge.name_hy} size={140} />
                    <span className={cn(
                      "text-[10px] font-bold leading-tight",
                      earned ? "text-primary" : "text-muted-foreground"
                    )}>
                      {badge.name_hy}
                    </span>
                    <span className="text-[9px] text-muted-foreground leading-tight">
                      {badge.description_hy}
                    </span>

                    {/* Progress indicator — only for unearned badges */}
                    {!earned && req && (
                      req.isRank ? (
                        <span className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                          {currentRank ? `#${currentRank}` : "—"}
                        </span>
                      ) : (
                        <div className="w-full mt-0.5 space-y-0.5">
                          <div className="h-1 w-full rounded-full bg-background/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums">
                            {Math.min(current, req.max)}/{req.max}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Point history */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              {L.volunteer.profile.recentPoints}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {transactions.map((tx: {
                amount: number;
                source_type: string;
                description: string | null;
                created_at: string;
              }, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.source_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-semibold text-sm ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount} pts
                    </span>
                  </div>
                  {i < transactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin link */}
      {(profile.role === "admin" || profile.role === "leader") && (
        <Button asChild variant="outline" className="w-full">
          <Link href="/admin">
            <Settings className="h-4 w-4" />
            {L.volunteer.profile.adminPanel}
          </Link>
        </Button>
      )}

      <SignOutButton />
    </div>
  );
}
