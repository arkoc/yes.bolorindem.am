"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { MapPin, FileText, ClipboardList, Camera, Pencil, Repeat } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskItem {
  id: string;
  title: string;
  task_type: string;
  completion_points: number;
  max_completions_per_user: number | null;
  is_active: boolean;
  order_index: number;
}

interface TaskListProps {
  projectId: string;
  initialTasks: TaskItem[];
}

export function TaskList({ projectId, initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const taskTypeIcon = (type: string) => {
    if (type === "location") return <MapPin className="h-4 w-4 text-blue-600" />;
    if (type === "form") return <FileText className="h-4 w-4 text-purple-600" />;
    if (type === "photo") return <Camera className="h-4 w-4 text-orange-600" />;
    return <ClipboardList className="h-4 w-4 text-gray-600" />;
  };

  const taskTypeBg = (type: string) => {
    if (type === "location") return "bg-blue-50";
    if (type === "form") return "bg-purple-50";
    if (type === "photo") return "bg-orange-50";
    return "bg-gray-50";
  };

  async function handleToggleActive(taskId: string, currentValue: boolean) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: !currentValue })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task.");
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_active: !currentValue } : t))
    );
    router.refresh();
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          No tasks yet. Create the first task for this project.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card key={task.id} className={!task.is_active ? "opacity-60" : ""}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${taskTypeBg(task.task_type)} shrink-0`}>
                {taskTypeIcon(task.task_type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-primary font-semibold">+{task.completion_points} pts</span>
                  <Badge variant="outline" className="text-xs capitalize">{task.task_type}</Badge>
                  {task.max_completions_per_user && task.max_completions_per_user > 1 && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Repeat className="h-3 w-3" />
                      ×{task.max_completions_per_user}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={task.is_active}
                  onCheckedChange={() => handleToggleActive(task.id, task.is_active)}
                />
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/admin/tasks/${task.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
