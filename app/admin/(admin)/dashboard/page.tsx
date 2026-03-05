import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, CheckCircle, Zap, Bell } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import L from "@/lib/labels";

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [usersRes, projectsRes, completionsTodayRes, totalPointsRes, pushSubsRes, recentCompletionsRes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }).neq("role", "admin"),
      supabase.from("projects").select("id", { count: "exact" }).eq("status", "active"),
      supabase
        .from("task_completions")
        .select("id", { count: "exact" })
        .eq("status", "approved")
        .gte("completed_at", today.toISOString()),
      supabase
        .from("point_transactions")
        .select("amount")
        .gt("amount", 0),
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
      supabase
        .from("task_completions")
        .select("id, points_awarded, completed_at, profiles!task_completions_user_id_fkey(full_name), tasks(title)")
        .order("completed_at", { ascending: false })
        .limit(10),
    ]);

  const totalPoints = (totalPointsRes.data ?? []).reduce(
    (sum: number, t: { amount: number }) => sum + t.amount, 0
  );

  const stats = [
    { label: L.admin.dashboard.statVolunteers, value: usersRes.count ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: L.admin.dashboard.statActiveProjects, value: projectsRes.count ?? 0, icon: FolderOpen, color: "text-purple-600", bg: "bg-purple-100" },
    { label: L.admin.dashboard.statCompletionsToday, value: completionsTodayRes.count ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    { label: L.admin.dashboard.statTotalPoints, value: formatPoints(totalPoints), icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: L.admin.dashboard.statPushSubscribers, value: pushSubsRes.count ?? 0, icon: Bell, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  const recentCompletions = recentCompletionsRes.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{L.admin.dashboard.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{L.admin.dashboard.subtitle}</p>
        </div>
        <Button asChild>
          <Link href="/admin/projects/new">{L.admin.dashboard.newProject}</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{L.admin.dashboard.recentCompletions}</CardTitle>
            <Link href="/admin/completions" className="text-sm text-primary hover:underline">{L.admin.dashboard.viewAll}</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentCompletions.length > 0 ? recentCompletions.map((rawC) => {
              const c = rawC as unknown as { id: string; points_awarded: number; completed_at: string; profiles: { full_name: string } | null; tasks: { title: string } | null };
              return (
                <div key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.tasks?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">+{c.points_awarded} pts</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                {L.admin.dashboard.noCompletions}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
