import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskList } from "@/components/admin/TaskList";
import { NewTaskButton } from "@/components/admin/NewTaskButton";
import L from "@/lib/labels";

export default async function AdminProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const [projectRes, tasksRes] = await Promise.all([
    supabase.from("projects").select("id, title, status").eq("id", id).single(),
    supabase
      .from("tasks")
      .select("id, title, task_type, completion_points, max_completions_per_user, is_active, order_index")
      .eq("project_id", id)
      .order("order_index"),
  ]);

  if (!projectRes.data) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> {L.admin.projects.backLink}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{projectRes.data.title}</h1>
            <p className="text-muted-foreground text-sm">{L.admin.projects.tasksSubtitle}</p>
          </div>
          <NewTaskButton projectId={id} />
        </div>
      </div>

      <TaskList
        projectId={id}
        initialTasks={tasksRes.data ?? []}
      />
    </div>
  );
}
