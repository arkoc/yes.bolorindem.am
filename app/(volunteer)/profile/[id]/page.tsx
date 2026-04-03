import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Zap, CheckCircle, Award, CheckCheck, ChevronLeft, ExternalLink } from "lucide-react";
import L, { t } from "@/lib/labels";
import { BadgeZoom } from "@/components/ui/badge-zoom";

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Redirect to own profile
  if (params.id === user.id) redirect("/profile");

  const adminClient = createAdminClient();

  const [profileRes, rankRes, allBadgesRes, userBadgesRes, completionsRes] = await Promise.all([
    adminClient
      .from("profiles")
      .select("full_name, total_points, role, created_at, bio, social_url, avatar_url")
      .eq("id", params.id)
      .single(),
    adminClient
      .from("leaderboard")
      .select("rank, total_completions")
      .eq("id", params.id)
      .single(),
    supabase
      .from("badges")
      .select("id, name_hy, description_hy, icon, image_url, sort_order")
      .order("sort_order"),
    adminClient
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", params.id),
    adminClient
      .from("point_transactions")
      .select("amount, source_type, description, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;
  if (!profile) redirect("/leaderboard");

  const rank = rankRes.data;
  const allBadges = allBadgesRes.data ?? [];
  const earnedIds = new Set((userBadgesRes.data ?? []).map((b) => b.badge_id));
  const transactions = completionsRes.data ?? [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {L.volunteer.leaderboard.title}
        </Link>
        <h1 className="text-2xl font-bold">{profile.full_name}</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} size={80} className="shrink-0" avatarUrl={(profile as { avatar_url?: string | null }).avatar_url} />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold">{profile.full_name}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant={profile.role === "admin" ? "default" : profile.role === "leader" ? "secondary" : "outline"}>
                  {profile.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  since {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
              {(profile as { bio?: string | null }).bio && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {(profile as { bio?: string | null }).bio}
                </p>
              )}
              {(profile as { social_url?: string | null }).social_url && (
                <Link
                  href={(profile as { social_url: string }).social_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {(profile as { social_url: string }).social_url.replace(/^https?:\/\//, "")}
                  </span>
                </Link>
              )}
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
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{L.volunteer.profile.statPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Trophy className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold truncate">{rank?.rank ? getRankSuffix(Number(rank.rank)) : "—"}</p>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{L.volunteer.profile.statRank}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold truncate">{rank?.total_completions ?? 0}</p>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{L.volunteer.profile.statTasksDone}</p>
          </CardContent>
        </Card>
      </div>

      {/* Earned badges */}
      {allBadges.length > 0 && earnedIds.size > 0 && (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allBadges
                .filter((b: { id: string }) => earnedIds.has(b.id))
                .map((badge: { id: string; name_hy: string; description_hy: string; icon: string; image_url: string | null }) => (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center bg-primary/10 border-primary/20"
                  >
                    <BadgeZoom
                      src={badge.image_url}
                      fallback={badge.icon}
                      name={badge.name_hy}
                      description={badge.description_hy}
                      size={140}
                      earned={true}
                    />
                    <span className="text-xs font-bold leading-tight text-primary">{badge.name_hy}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{badge.description_hy}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent point activity */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCheck className="h-4 w-4 text-green-500" />
              {L.volunteer.profile.recentCompletions}
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
    </div>
  );
}
