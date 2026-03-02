import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, FolderOpen, CheckCircle, ArrowRight, Zap } from "lucide-react";
import L, { t } from "@/lib/labels";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = await createAdminClient();

  // Fetch profile + rank in one go using the leaderboard view
  const [profileRes, rankRes, recentRes, activeProjectsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, total_points, role")
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
  ]);

  const profile = profileRes.data;
  const rank = rankRes.data?.rank;
  const recent = recentRes.data ?? [];
  const activeProjects = activeProjectsRes.data ?? [];

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

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPoints(profile.total_points)}</p>
                <p className="text-xs text-muted-foreground">{L.volunteer.dashboard.statPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rank ? getRankSuffix(Number(rank)) : "—"}</p>
                <p className="text-xs text-muted-foreground">{L.volunteer.dashboard.statLeaderboard}</p>
              </div>
            </div>
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
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{project.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(L.volunteer.dashboard.taskCount, { count: project.tasks?.[0]?.count ?? 0 })}
                        </p>
                      </div>
                      {project.completion_bonus_points > 0 && (
                        <Badge variant="success" className="shrink-0">
                          {t(L.volunteer.dashboard.bonus, { points: project.completion_bonus_points })}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
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
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.tasks?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.tasks?.projects?.title}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 shrink-0 ml-2">
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
