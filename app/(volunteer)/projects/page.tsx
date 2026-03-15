import Image from "next/image";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Calendar, ArrowRight, Star, MapPin, Coins, Plus, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPoints } from "@/lib/utils";
import L, { t } from "@/lib/labels";
import { Progress } from "@/components/ui/progress";

export default async function ProjectsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projectsRaw, bountiesRaw, myBountiesRaw] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, description, banner_url, status, start_date, end_date, completion_bonus_points, project_type, tasks(id, max_completions_per_user)")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_bounties")
      .select("id, title, description, reward_points, is_repeatable, max_completions, status, created_at, creator_id, creator:profiles!user_bounties_creator_id_fkey(full_name)")
      .eq("status", "open")
      .neq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_bounties")
      .select("id, title, description, reward_points, is_repeatable, max_completions, status, created_at, creator_id, creator:profiles!user_bounties_creator_id_fkey(full_name)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const projects = (projectsRaw.data ?? []) as {
    id: string;
    title: string;
    description: string | null;
    banner_url: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    completion_bonus_points: number;
    project_type: string;
    tasks: { id: string; max_completions_per_user: number | null }[];
  }[];

  type BountyItem = {
    id: string;
    title: string;
    description: string | null;
    reward_points: number;
    is_repeatable: boolean;
    max_completions: number | null;
    status: string;
    created_at: string;
    creator_id: string;
    creator: { full_name: string } | null;
  };

  const bounties = (bountiesRaw.data ?? []) as unknown as BountyItem[];
  const myBounties = (myBountiesRaw.data ?? []) as unknown as BountyItem[];

  const allTaskIds = projects.flatMap(p => p.tasks.map(t => t.id));
  const { data: completionsRaw } = allTaskIds.length > 0
    ? await supabase
        .from("task_completions")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .in("task_id", allTaskIds)
    : { data: [] };
  const taskCompletionCount: Record<string, number> = {};
  for (const c of (completionsRaw ?? []) as { task_id: string }[]) {
    taskCompletionCount[c.task_id] = (taskCompletionCount[c.task_id] ?? 0) + 1;
  }

  const locationProjects = projects.filter(p => p.project_type === "heatmap");
  const campaignProjects = projects.filter(p => p.project_type === "standard");

  function ProjectCard({ project }: { project: typeof projects[0] }) {
    const isHeatmap = project.project_type === "heatmap";
    const taskCount = project.tasks.length;
    const completedCount = project.tasks.filter(t =>
      (taskCompletionCount[t.id] ?? 0) >= (t.max_completions_per_user ?? 1)
    ).length;
    const progressPercent = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;
    const daysLeft = project.end_date
      ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86_400_000)
      : null;

    return (
      <Link href={isHeatmap ? `/heatmap/${project.id}` : `/projects/${project.id}`} className="block">
        <Card className="hover:shadow-md transition-all active:scale-[0.99] cursor-pointer border-l-4 border-l-primary">
          {project.banner_url && (
            <div className="h-32 w-full overflow-hidden rounded-t-lg relative">
              <Image
                src={project.banner_url}
                alt={project.title}
                fill
                className="object-cover"
                sizes="(max-width: 672px) 100vw, 672px"
              />
            </div>
          )}
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{project.title}</CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {daysLeft !== null && daysLeft >= 0 && (
                  <Badge variant={daysLeft === 0 ? "destructive" : daysLeft <= 7 ? "warning" : "secondary"} className="text-xs">
                    {daysLeft === 0 ? L.volunteer.projects.lastDay : t(L.volunteer.projects.daysLeft, { days: daysLeft })}
                  </Badge>
                )}
                {project.completion_bonus_points > 0 && (
                  <Badge variant="success" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {formatPoints(project.completion_bonus_points)} bonus
                  </Badge>
                )}
              </div>
            </div>
            {project.description && (
              <CardDescription className="text-sm line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  {isHeatmap ? (
                    <><MapPin className="h-3.5 w-3.5" />{L.volunteer.projects.heatmapLabel}</>
                  ) : (
                    <><FolderOpen className="h-3.5 w-3.5" />{t(L.volunteer.projects.taskCount, { count: taskCount })}</>
                  )}
                </span>
                {(project.start_date || project.end_date) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {project.start_date && project.end_date
                      ? `${new Date(project.start_date).toLocaleDateString()} – ${new Date(project.end_date).toLocaleDateString()}`
                      : project.start_date
                      ? t(L.volunteer.projects.dateFrom, { date: new Date(project.start_date).toLocaleDateString() })
                      : t(L.volunteer.projects.dateUntil, { date: new Date(project.end_date!).toLocaleDateString() })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-primary shrink-0">
                <span className="text-xs font-semibold">{L.volunteer.dashboard.startBtn}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
            {!isHeatmap && taskCount > 0 && (
              <div className="space-y-1">
                <Progress value={progressPercent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{completedCount}/{taskCount}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="pt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{L.volunteer.projects.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {L.volunteer.projects.subtitle}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0 gap-1 mt-1">
          <Link href="/bounties/create">
            <Plus className="h-3.5 w-3.5" />
            {L.bounty.createTitle}
          </Link>
        </Button>
      </div>

      {/* Location projects (heatmap) */}
      {locationProjects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {L.bounty.groupLocation}
          </h2>
          {locationProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </section>
      )}

      {/* Campaign projects (standard) */}
      {campaignProjects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            {L.bounty.groupCampaign}
          </h2>
          {campaignProjects.map(p => <ProjectCard key={p.id} project={p} />)}
        </section>
      )}

      {/* Open bounties */}
      {bounties.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            {L.bounty.groupBounties}
          </h2>
          {bounties.map((b) => (
            <BountyCard key={b.id} b={b} />
          ))}
        </section>
      )}

      {/* My bounties */}
      {myBounties.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            {L.bounty.groupMyBounties}
          </h2>
          {myBounties.map((b) => (
            <BountyCard key={b.id} b={b} mine />
          ))}
        </section>
      )}
    </div>
  );

  function BountyCard({ b, mine = false }: { b: BountyItem; mine?: boolean }) {
    const closed = b.status !== "open";
    return (
      <Link href={`/bounties/${b.id}`} className="block">
        <Card className={`hover:shadow-md transition-all active:scale-[0.99] cursor-pointer border-l-4 ${closed ? "border-l-muted-foreground/30 opacity-75" : "border-l-yellow-500"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className={`text-base leading-snug ${closed ? "text-muted-foreground" : ""}`}>{b.title}</CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {mine && closed && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {b.status === "closed" ? "Ավարտված" : "Չեղարկված"}
                  </Badge>
                )}
                {b.is_repeatable && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Repeat2 className="h-3 w-3" />
                    {b.max_completions ?? "∞"}
                  </Badge>
                )}
                <Badge variant={closed ? "outline" : "success"} className="text-xs">
                  +{b.reward_points}
                </Badge>
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
    );
  }
}
