"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { MapPin, FileText, ClipboardList, Camera, Pencil, Repeat, ChevronUp, ChevronDown } from "lucide-react";
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
  const [reordering, setReordering] = useState(false);
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

  async function handleMove(fromIndex: number, toIndex: number) {
    if (reordering) return;
    setReordering(true);

    const prev = tasks;
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, moved);

    // Normalize order_index to match new array positions
    const reindexed = newTasks.map((t, i) => ({ ...t, order_index: i }));
    setTasks(reindexed);

    // Only update rows whose order_index actually changed
    const originalIndex = Object.fromEntries(prev.map((t) => [t.id, t.order_index]));
    const changed = reindexed.filter((t) => t.order_index !== originalIndex[t.id]);

    const results = await Promise.all(
      changed.map((t) =>
        supabase.from("tasks").update({ order_index: t.order_index }).eq("id", t.id)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed) {
      toast.error("Failed to reorder tasks.");
      setTasks(prev);
    } else {
      router.refresh();
    }

    setReordering(false);
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
      {tasks.map((task, index) => (
        <Card key={task.id} className={!task.is_active ? "opacity-60" : ""}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              {/* Reorder arrows */}
              <div className="flex flex-col shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0 || reordering}
                  onClick={() => handleMove(index, index - 1)}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === tasks.length - 1 || reordering}
                  onClick={() => handleMove(index, index + 1)}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

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
