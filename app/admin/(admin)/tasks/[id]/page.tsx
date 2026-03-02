import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TaskFormWrapper } from "@/components/admin/TaskFormWrapper";
import { type Task } from "@/lib/db/schema";
import L from "@/lib/labels";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: raw } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (!raw) notFound();

  // Supabase returns snake_case; map to the camelCase Task type
  const task = {
    id: raw.id,
    projectId: raw.project_id,
    title: raw.title,
    description: raw.description ?? null,
    taskType: raw.task_type,
    completionPoints: raw.completion_points,
    maxCompletionsPerUser: raw.max_completions_per_user ?? null,
    totalCompletionsAllowed: raw.total_completions_allowed ?? null,
    requiresEvidence: raw.requires_evidence,
    formSchema: raw.form_schema ?? null,
    locationData: raw.location_data ?? null,
    isActive: raw.is_active,
    orderIndex: raw.order_index,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  } as unknown as Task;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/projects/${raw.project_id}/tasks`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> {L.admin.tasks.backLink}
        </Link>
        <h1 className="text-2xl font-bold">{L.admin.tasks.editTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{raw.title}</p>
      </div>
      <TaskFormWrapper task={task} />
    </div>
  );
}
