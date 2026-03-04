import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, FolderOpen, CheckCircle, ArrowRight, Zap, Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";
import { BadgeZoom } from "@/components/ui/badge-zoom";
import { CopyReferralButton } from "@/components/volunteer/ReferralLinkCopy";
import { PushNotificationBanner } from "@/components/volunteer/PushNotificationBanner";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = await createAdminClient();

  const [profileRes, rankRes, recentRes, activeProjectsRes, earnedBadgesRes, allBadgesRes, referralRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, total_points, role, referral_code")
      .eq("id", user.id)
      .single(),
    adminClient
      .from("leaderboard")
      .select("rank")
      .eq("id", user.id)
      .single(),
    supabase
      .from("task_completions")
      .select("id, points_awarded, completed_at, tasks(title, projects(title))")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("completed_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("id, title, completion_bonus_points, tasks(count)")
      .eq("status", "active")
      .limit(4),
    supabase
      .from("user_badges")
      .select("badge_id, badges(icon, name_hy, description_hy, image_url)")
      .eq("user_id", user.id)
      .order("awarded_at", { ascending: true }),
    supabase
      .from("badges")
      .select("id, icon, name_hy, description_hy, image_url")
      .order("sort_order"),
    adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
  ]);

  const profile = profileRes.data;
  const rank = rankRes.data?.rank;
  const recent = recentRes.data ?? [];
  const activeProjects = activeProjectsRes.data ?? [];
  const earnedBadges = (earnedBadgesRes.data ?? []) as unknown as { badge_id: string; badges: { icon: string; name_hy: string; description_hy: string | null; image_url: string | null } }[];
  const allBadges = (allBadgesRes.data ?? []) as { id: string; icon: string; name_hy: string; description_hy: string | null; image_url: string | null }[];
  const totalBadges = allBadges.length;
  const referralCode = (profile as { referral_code?: string | null } | null)?.referral_code ?? null;
  const referralCount = referralRes.count ?? 0;
  const badgeDisplayList = earnedBadges.length > 0
    ? earnedBadges.slice(0, 5).map(b => ({ id: b.badge_id, ...b.badges, earned: true }))
    : allBadges.slice(0, 5).map(b => ({ ...b, earned: false }));

  if (!profile) redirect("/register");

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Hero card */}
      <Card className="bg-gradient-to-br from-primary to-red-800 text-white border-0">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} size={64} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-sm">{L.volunteer.dashboard.greeting}</p>
              <h1 className="text-xl font-bold truncate">{profile.full_name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-yellow-300 font-semibold">
                  <Zap className="h-4 w-4" />
                  {formatPoints(profile.total_points)} pts
                </span>
                {rank && (
                  <span className="flex items-center gap-1 text-blue-100 text-sm">
                    <Trophy className="h-3.5 w-3.5" />
                    {t(L.volunteer.dashboard.rankDisplay, { rank: getRankSuffix(Number(rank)) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Push notification banner */}
      <PushNotificationBanner />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="p-1.5 rounded-lg bg-yellow-100 w-fit mx-auto mb-1">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-xl font-bold">{formatPoints(profile.total_points)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{L.volunteer.dashboard.statPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="p-1.5 rounded-lg bg-blue-100 w-fit mx-auto mb-1">
              <Trophy className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold">{rank ? getRankSuffix(Number(rank)) : "—"}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{L.volunteer.dashboard.statLeaderboard}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="p-1.5 rounded-lg bg-orange-100 w-fit mx-auto mb-1">
              <Award className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-xl font-bold">{earnedBadges.length}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{L.volunteer.dashboard.statBadges}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              {L.volunteer.dashboard.activeProjects}
            </h2>
            <Link href="/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
              {L.admin.dashboard.viewAll} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeProjects.map((project: {
              id: string;
              title: string;
              completion_bonus_points: number;
              tasks: { count: number }[];
            }) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-all active:scale-[0.99] border-l-4 border-l-primary">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base truncate">{project.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-sm text-muted-foreground">
                            {t(L.volunteer.dashboard.taskCount, { count: project.tasks?.[0]?.count ?? 0 })}
                          </p>
                          {project.completion_bonus_points > 0 && (
                            <Badge variant="success" className="shrink-0 text-xs">
                              {t(L.volunteer.dashboard.bonus, { points: project.completion_bonus_points })}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary shrink-0">
                        <span className="text-xs font-semibold">{L.volunteer.dashboard.startBtn}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Badges section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-base">
            {L.volunteer.dashboard.badgesSection}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {earnedBadges.length}/{totalBadges}
            </span>
          </h2>
          <Link href="/profile" className="text-xs text-primary hover:underline">
            {earnedBadges.length > 0 ? L.volunteer.dashboard.badgesShowAll : L.volunteer.dashboard.badgesEarnFirst}
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {badgeDisplayList.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex flex-col items-center shrink-0 rounded-xl border p-2 text-center w-28",
                b.earned ? "bg-primary/10 border-primary/20" : "opacity-40 bg-muted border-transparent"
              )}
            >
              <BadgeZoom src={b.image_url} fallback={b.icon} name={b.name_hy} description={b.description_hy ?? undefined} size={88} earned={b.earned} />
            </div>
          ))}
        </div>
      </section>

      {/* Referral stat */}
      {referralCode && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-green-100 shrink-0">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{t(L.volunteer.dashboard.referralStat, { count: referralCount })}</p>
                <p className="text-xs text-green-600 font-semibold">{L.volunteer.dashboard.referralIncentive}</p>
              </div>
            </div>
            <CopyReferralButton referralCode={referralCode} label={L.volunteer.dashboard.referralCopyLink} />
          </CardContent>
        </Card>
      )}

      {/* Recent completions */}
      {recent.length > 0 && (
        <section>
          <h2 className="font-semibold text-base flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {L.volunteer.dashboard.recentActivity}
          </h2>
          <div className="space-y-2">
            {recent.map((c) => {
              const item = c as unknown as { id: string; points_awarded: number; tasks: { title: string; projects: { title: string } | null } | null };
              return (
                <div key={item.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{item.tasks?.title}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{item.tasks?.projects?.title}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-green-600 shrink-0 ml-2">
                    +{item.points_awarded} pts
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activeProjects.length === 0 && recent.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{L.volunteer.dashboard.emptyProjectsTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {L.volunteer.dashboard.emptyProjectsText}
            </p>
            <Button asChild variant="outline">
              <Link href="/projects">{L.volunteer.dashboard.browseProjects}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
