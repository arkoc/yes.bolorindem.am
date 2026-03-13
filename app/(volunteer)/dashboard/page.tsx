import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, FolderOpen, ArrowRight, Zap, Award, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";
import { BadgeZoom } from "@/components/ui/badge-zoom";
import { CopyReferralButton } from "@/components/volunteer/ReferralLinkCopy";
import { PushNotificationBanner } from "@/components/volunteer/PushNotificationBanner";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const [profileRes, rankRes, activeProjectsRes, earnedBadgesRes, allBadgesRes, referralRes, recentActivityRes] = await Promise.all([
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
      .from("projects")
      .select("id, title, completion_bonus_points, tasks(id, max_completions_per_user)")
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
    supabase
      .from("point_transactions")
      .select("amount, source_type, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const rank = rankRes.data?.rank;
  const activeProjects = (activeProjectsRes.data ?? []) as {
    id: string;
    title: string;
    completion_bonus_points: number;
    tasks: { id: string; max_completions_per_user: number | null }[];
  }[];

  // Fetch user's approved completions for all tasks in active projects
  const allDashTaskIds = activeProjects.flatMap(p => p.tasks.map(t => t.id));
  const { data: dashCompletions } = allDashTaskIds.length > 0
    ? await supabase
        .from("task_completions")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .in("task_id", allDashTaskIds)
    : { data: [] };
  const taskCompletionCount: Record<string, number> = {};
  for (const c of (dashCompletions ?? []) as { task_id: string }[]) {
    taskCompletionCount[c.task_id] = (taskCompletionCount[c.task_id] ?? 0) + 1;
  }
  const earnedBadges = (earnedBadgesRes.data ?? []) as unknown as { badge_id: string; badges: { icon: string; name_hy: string; description_hy: string | null; image_url: string | null } }[];
  const allBadges = (allBadgesRes.data ?? []) as { id: string; icon: string; name_hy: string; description_hy: string | null; image_url: string | null }[];
  const totalBadges = allBadges.length;
  const referralCode = (profile as { referral_code?: string | null } | null)?.referral_code ?? null;
  const referralCount = referralRes.count ?? 0;
  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));
  const earnedList = earnedBadges.slice(0, 5).map(b => ({ id: b.badge_id, ...b.badges, earned: true }));
  const unearnedList = allBadges.filter(b => !earnedBadgeIds.has(b.id)).map(b => ({ ...b, earned: false }));
  const badgeDisplayList = [...earnedList, ...unearnedList].slice(0, 5);
  const recentActivity = (recentActivityRes.data ?? []) as { amount: number; source_type: string; description: string | null; created_at: string }[];

  if (!profile) redirect("/register");

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Hero card */}
      <Card className="bg-gradient-to-br from-primary to-red-800 text-white border-0 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} size={64} className="shrink-0 ring-2 ring-white/30" />
            <div className="flex-1 min-w-0">
              <p className="text-blue-100 text-xs font-medium">{L.volunteer.dashboard.greeting}</p>
              <h1 className="text-xl font-bold truncate mt-0.5">{profile.full_name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-sm font-bold text-yellow-200">
                  <Zap className="h-3.5 w-3.5" />
                  {formatPoints(profile.total_points)} pts
                </span>
                {rank && (
                  <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs text-blue-100">
                    <Trophy className="h-3 w-3" />
                    {t(L.volunteer.dashboard.rankDisplay, { rank: getRankSuffix(Number(rank)) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Elections 2026 banner */}
      {/* <Link href="/elections">
        <Card className="border-2 border-amber-400/50 bg-gradient-to-r from-amber-50 to-orange-50 hover:shadow-md transition-all active:scale-[0.99]">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <span className="text-2xl shrink-0">🏛</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{L.elections.dashboardBannerTitle}</p>
              <p className="text-xs text-muted-foreground leading-tight">{L.elections.dashboardBannerText}</p>
            </div>
            <span className="text-xs font-semibold text-amber-700 shrink-0">{L.elections.dashboardBannerBtn}</span>
          </CardContent>
        </Card>
      </Link> */}

      {/* Push notification banner */}
      <PushNotificationBanner />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="p-1.5 rounded-lg bg-yellow-100 w-fit mx-auto mb-1.5">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-lg font-bold truncate">{formatPoints(profile.total_points)}</p>
            <p className="text-xs text-muted-foreground leading-tight">{L.volunteer.dashboard.statPoints}</p>
          </CardContent>
        </Card>
        <Link href="/leaderboard">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 text-center">
              <div className="p-1.5 rounded-lg bg-blue-100 w-fit mx-auto mb-1.5">
                <Trophy className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-lg font-bold truncate">{rank ? getRankSuffix(Number(rank)) : "—"}</p>
              <p className="text-xs text-muted-foreground leading-tight">{L.volunteer.dashboard.statLeaderboard}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/profile">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 text-center">
              <div className="p-1.5 rounded-lg bg-orange-100 w-fit mx-auto mb-1.5">
                <Award className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-lg font-bold truncate">{earnedBadges.length}</p>
              <p className="text-xs text-muted-foreground leading-tight">{L.volunteer.dashboard.statBadges}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active projects */}
      {activeProjects.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {L.volunteer.dashboard.activeProjects}
            </h2>
            <Link href="/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
              {L.admin.dashboard.viewAll} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeProjects.map((project) => {
              const taskCount = project.tasks.length;
              const completedCount = project.tasks.filter(t =>
                (taskCompletionCount[t.id] ?? 0) >= (t.max_completions_per_user ?? 1)
              ).length;
              const progressPercent = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;
              const allDone = taskCount > 0 && completedCount === taskCount;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className={cn(
                    "hover:shadow-md transition-all active:scale-[0.99] border-l-4",
                    allDone ? "border-l-green-500 bg-green-50/50" : "border-l-primary"
                  )}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{project.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {project.completion_bonus_points > 0 && (
                              <Badge variant="success" className="text-xs shrink-0">
                                {t(L.volunteer.dashboard.bonus, { points: project.completion_bonus_points })}
                              </Badge>
                            )}
                          </div>
                          {taskCount > 0 && (
                            <div className="mt-2 space-y-0.5">
                              <Progress value={progressPercent} className="h-1.5" />
                              <p className="text-xs text-muted-foreground">{completedCount}/{taskCount} {allDone ? "✓" : ""}</p>
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">{L.volunteer.dashboard.emptyProjectsTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">{L.volunteer.dashboard.emptyProjectsText}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">{L.volunteer.dashboard.browseProjects}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Badges section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {L.volunteer.dashboard.badgesSection}
            <span className="ml-2 normal-case font-normal">{earnedBadges.length}/{totalBadges}</span>
          </h2>
          <Link href="/profile" className="text-xs text-primary hover:underline">
            {earnedBadges.length > 0 ? L.volunteer.dashboard.badgesShowAll : L.volunteer.dashboard.badgesEarnFirst}
          </Link>
        </div>
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
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

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              {L.volunteer.profile.recentPoints}
            </h2>
            <Link href="/profile" className="text-xs text-primary hover:underline">
              {L.admin.dashboard.viewAll}
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm text-muted-foreground truncate flex-1 mr-3">{tx.description || tx.source_type}</p>
                    <span className={cn("font-semibold text-sm shrink-0 tabular-nums", tx.amount > 0 ? "text-green-600" : "text-red-500")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount} pts
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
