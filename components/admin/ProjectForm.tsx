"use client";

import L from "@/lib/labels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
import { type Project } from "@/lib/db/schema";

const projectSchema = z.object({
  title: z.string().min(1, L.forms.project.titleRequired),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]),
  completion_bonus_points: z.coerce.number().min(0).default(0),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  project?: Project;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project?.title ?? "",
      description: project?.description ?? "",
      status: (project?.status as "draft" | "active" | "completed" | "archived") ?? "draft",
      completion_bonus_points: project?.completionBonusPoints ?? 0,
      start_date: project?.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      end_date: project?.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
    },
  });

  async function onSubmit(data: ProjectFormValues) {
    setLoading(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        completion_bonus_points: data.completion_bonus_points,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      };

      if (project?.id) {
        const { error } = await supabase
          .from("projects")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", project.id);
        if (error) throw error;
        toast.success(L.forms.project.toastUpdated);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("projects")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success(L.forms.project.toastCreated);
      }
      router.push("/admin/projects");
      router.refresh();
    } catch {
      toast.error(L.forms.project.toastSaveFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!project?.id || !confirm(L.forms.project.deleteConfirm)) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) {
      toast.error(L.forms.project.toastDeleteFailed);
    } else {
      toast.success(L.forms.project.toastDeleted);
      router.push("/admin/projects");
      router.refresh();
    }
    setDeleting(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">{L.forms.project.titleLabel}</Label>
            <Input id="title" {...register("title")} placeholder={L.forms.project.titlePlaceholder} className="h-11" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{L.forms.project.descriptionLabel}</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder={L.forms.project.descriptionPlaceholder}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{L.forms.project.statusLabel}</Label>
              <Select
                defaultValue={project?.status ?? "draft"}
                onValueChange={(v) => setValue("status", v as "draft" | "active" | "completed" | "archived")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{L.forms.project.statusDraft}</SelectItem>
                  <SelectItem value="active">{L.forms.project.statusActive}</SelectItem>
                  <SelectItem value="completed">{L.forms.project.statusCompleted}</SelectItem>
                  <SelectItem value="archived">{L.forms.project.statusArchived}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bonus">{L.forms.project.bonusPointsLabel}</Label>
              <Input
                id="bonus"
                type="number"
                inputMode="numeric"
                min="0"
                {...register("completion_bonus_points")}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">{L.forms.project.startDateLabel}</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">{L.forms.project.endDateLabel}</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : project ? L.forms.project.submitUpdate : L.forms.project.submitCreate}
            </Button>
            {project && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                size="icon"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
