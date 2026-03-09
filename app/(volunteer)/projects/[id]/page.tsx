import Image from "next/image";
import { createServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, MapPin, ClipboardList, Star, CheckCircle, Repeat, FileText, Calendar } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";

interface TaskWithCompletion {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  completion_points: number;
  max_completions_per_user: number | null;
  is_active: boolean;
  order_index: number;
  userCompletions: number;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projectRes, tasksRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, description, banner_url, status, completion_bonus_points, start_date, end_date")
      .eq("id", id)
      .single(),
    supabase
      .from("tasks")
      .select("id, title, description, task_type, completion_points, max_completions_per_user, is_active, order_index")
      .eq("project_id", id)
      .eq("is_active", true)
      .order("order_index"),
  ]);

  if (!projectRes.data) notFound();
  const project = projectRes.data;
  const tasks = tasksRes.data ?? [];

  // Get user's completions for these tasks
  const taskIds = tasks.map((t: { id: string }) => t.id);
  const { data: completions } = taskIds.length > 0
    ? await supabase
        .from("task_completions")
        .select("task_id, completion_number")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .in("task_id", taskIds)
    : { data: [] };

  // Count completions per task
  const completionCount: Record<string, number> = {};
  (completions ?? []).forEach((c: { task_id: string }) => {
    completionCount[c.task_id] = (completionCount[c.task_id] || 0) + 1;
  });

  const tasksWithCompletion: TaskWithCompletion[] = tasks.map((t: {
    id: string;
    title: string;
    description: string | null;
    task_type: string;
    completion_points: number;
    max_completions_per_user: number | null;
    is_active: boolean;
    order_index: number;
  }) => ({
    ...t,
    userCompletions: completionCount[t.id] ?? 0,
  }));

  const completedCount = tasksWithCompletion.filter(
    (t) => t.userCompletions >= (t.max_completions_per_user ?? 1)
  ).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const taskTypeIcon = (type: string) => {
    if (type === "location") return <MapPin className="h-4 w-4" />;
    if (type === "form") return <FileText className="h-4 w-4" />;
    return <ClipboardList className="h-4 w-4" />;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Banner / Header */}
      {project.banner_url && (
        <div className="h-40 w-full overflow-hidden relative">
          <Image src={project.banner_url} alt={project.title} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
        </div>
      )}

      <div className="p-4 md:p-6 space-y-5">
        <div>
          <Link href="/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-4 w-4" /> {L.volunteer.projectDetail.backLink}
          </Link>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{project.title}</h1>
            {project.completion_bonus_points > 0 && (
              <Badge variant="success" className="shrink-0">
                <Star className="h-3 w-3 mr-1" />
                {formatPoints(project.completion_bonus_points)} bonus
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="text-muted-foreground text-sm mt-2">{project.description}</p>
          )}
          {(project.start_date || project.end_date) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {project.start_date && project.end_date
                ? `${new Date(project.start_date).toLocaleDateString()} – ${new Date(project.end_date).toLocaleDateString()}`
                : project.start_date
                ? t(L.volunteer.projects.dateFrom, { date: new Date(project.start_date).toLocaleDateString() })
                : t(L.volunteer.projects.dateUntil, { date: new Date(project.end_date!).toLocaleDateString() })}
            </p>
          )}
        </div>

        {/* Progress */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{L.volunteer.projectDetail.yourProgress}</span>
              <span className="text-muted-foreground">{t(L.volunteer.projectDetail.progressText, { completed: completedCount, total: tasks.length })}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{L.volunteer.projectDetail.tasksHeading}</h2>
          {tasksWithCompletion.map((task) => {
            const maxCompletions = task.max_completions_per_user ?? 1;
            const isDone = task.userCompletions >= maxCompletions;
            const isRepeatable = maxCompletions > 1 || maxCompletions === null;

            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className={cn("hover:shadow-md active:scale-[0.99] transition-all cursor-pointer border-l-4", isDone ? "border-l-green-500 bg-green-50/40" : "border-l-transparent")}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {isDone ? (
                        <div className="p-2 rounded-lg bg-green-100 shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          {taskTypeIcon(task.task_type)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-primary font-semibold">+{task.completion_points} pts</span>
                          {isRepeatable && maxCompletions > 1 && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Repeat className="h-3 w-3" />
                              {task.userCompletions}/{maxCompletions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground text-sm">{L.volunteer.projectDetail.emptyTasks}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
