import { createServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, ClipboardList, FileText, Camera, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StandardCompletion } from "@/components/tasks/CompletionFlow/StandardCompletion";
import { FormCompletion } from "@/components/tasks/CompletionFlow/FormCompletion";
import { LocationCompletion } from "@/components/tasks/CompletionFlow/LocationCompletion";
import { PhotoCompletion } from "@/components/tasks/CompletionFlow/PhotoCompletion";
import { type FormSchema, type TaskLocationData } from "@/lib/db/schema";
import L, { t } from "@/lib/labels";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, task_type, completion_points, max_completions_per_user, requires_evidence, form_schema, location_data, is_active, project_id, projects(id, title)")
    .eq("id", id)
    .single();

  if (!task) notFound();

  // Get user's completions for this task (count + location data for per-point counts)
  const { data: userCompletionRows, count: completionCount } = await supabase
    .from("task_completions")
    .select("location_data", { count: "exact" })
    .eq("task_id", id)
    .eq("user_id", user.id)
    .eq("status", "approved");

  const userCompletions = completionCount ?? 0;

  // Build per-point completion counts (for location tasks)
  const perPointCompletions: Record<string, number> = {};
  for (const row of userCompletionRows ?? []) {
    const pointId = (row.location_data as { selectedPointId?: string } | null)?.selectedPointId;
    if (pointId) perPointCompletions[pointId] = (perPointCompletions[pointId] ?? 0) + 1;
  }
  const maxCompletions = task.max_completions_per_user ?? 1;
  const isDone = userCompletions >= maxCompletions;
  const isRepeatable = maxCompletions > 1;

  const taskTypeLabel = {
    standard: L.volunteer.taskDetail.typeStandard,
    form: L.volunteer.taskDetail.typeForm,
    location: L.volunteer.taskDetail.typeLocation,
    photo: L.volunteer.taskDetail.typePhoto,
  }[task.task_type as string] ?? L.volunteer.taskDetail.typeDefault;

  const taskTypeIcon = {
    standard: <ClipboardList className="h-5 w-5" />,
    form: <FileText className="h-5 w-5" />,
    location: <MapPin className="h-5 w-5" />,
    photo: <Camera className="h-5 w-5" />,
  }[task.task_type as string];

  const project = (task.projects as unknown) as { id: string; title: string } | null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      {/* Back link */}
      {project && (
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t(L.volunteer.taskDetail.backLink, { title: project.title })}
        </Link>
      )}

      {/* Task header */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              {taskTypeIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{task.title}</h1>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs">{taskTypeLabel}</Badge>
                <Badge className="text-xs">+{task.completion_points} pts</Badge>
                {isRepeatable && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    {userCompletions}/{maxCompletions}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {task.description && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {task.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completion UI */}
      {task.task_type === "standard" && (
        <StandardCompletion
          taskId={task.id}
          projectId={project?.id ?? ""}
          taskTitle={task.title}
          points={task.completion_points}
          isDone={isDone}
          isRepeatable={isRepeatable}
          userCompletions={userCompletions}
          maxCompletions={maxCompletions}
        />
      )}

      {task.task_type === "form" && (
        <FormCompletion
          taskId={task.id}
          projectId={project?.id ?? ""}
          points={task.completion_points}
          formSchema={task.form_schema as FormSchema}
          isDone={isDone}
          isRepeatable={isRepeatable}
          userCompletions={userCompletions}
          maxCompletions={maxCompletions}
        />
      )}

      {task.task_type === "location" && (
        <LocationCompletion
          taskId={task.id}
          projectId={project?.id ?? ""}
          points={task.completion_points}
          locationData={task.location_data as TaskLocationData}
          isDone={isDone}
          isRepeatable={isRepeatable}
          userCompletions={userCompletions}
          maxCompletions={maxCompletions}
          perPointCompletions={perPointCompletions}
        />
      )}

      {task.task_type === "photo" && (
        <PhotoCompletion
          taskId={task.id}
          projectId={project?.id ?? ""}
          points={task.completion_points}
          isDone={isDone}
          isRepeatable={isRepeatable}
          userCompletions={userCompletions}
          maxCompletions={maxCompletions}
        />
      )}
    </div>
  );
}
