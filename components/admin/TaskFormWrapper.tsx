"use client";

import { useRouter } from "next/navigation";
import { TaskForm } from "./TaskForm";
import { Card, CardContent } from "@/components/ui/card";
import { type Task } from "@/lib/db/schema";

export function TaskFormWrapper({ task }: { task: Task }) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="pt-6">
        <TaskForm
          projectId={task.projectId}
          task={task}
          onSuccess={() => {
            router.push(`/admin/projects/${task.projectId}/tasks`);
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
