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
          onSuccess={(isDelete) => {
            const url = `/admin/projects/${task.projectId}/tasks`;
            if (isDelete) {
              window.location.href = url;
            } else {
              router.push(url);
              router.refresh();
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
