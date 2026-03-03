"use client";

import L from "@/lib/labels";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { FormSchemaBuilder } from "./FormSchemaBuilder";
import { LocationDataBuilder } from "./LocationDataBuilder";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { type Task, type FormSchema, type TaskLocationData } from "@/lib/db/schema";

const taskSchema = z.object({
  title: z.string().min(1, L.forms.task.titleRequired),
  description: z.string().optional(),
  task_type: z.enum(["standard", "form", "location", "photo"]),
  completion_points: z.coerce.number().min(0),
  max_completions_per_user: z.coerce.number().min(1).nullable(),
  is_active: z.boolean(),
  order_index: z.coerce.number().default(0),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  projectId: string;
  task?: Task;
  onSuccess?: (isDelete?: boolean) => void;
}

export function TaskForm({ projectId, task, onSuccess }: TaskFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formSchema, setFormSchema] = useState<FormSchema>(
    (task?.formSchema as FormSchema) ?? { fields: [] }
  );
  const [locationData, setLocationData] = useState<TaskLocationData>(
    (task?.locationData as TaskLocationData) ?? {
      center: [40.7128, -74.006],
      defaultZoom: 15,
      description: "",
      targetPoints: [],
    }
  );

  const [unlimited, setUnlimited] = useState(task?.maxCompletionsPerUser === null);
  const [periodType, setPeriodType] = useState<"none" | "day" | "week">(
    (task?.periodType as "day" | "week" | null) ?? "none"
  );
  const [periodLimit, setPeriodLimit] = useState<number>(task?.periodLimit ?? 1);
  const [allowBatch, setAllowBatch] = useState(task?.allowBatchSubmission ?? false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      task_type: (task?.taskType as "standard" | "form" | "location" | "photo") ?? "standard",
      completion_points: task?.completionPoints ?? 10,
      max_completions_per_user: task?.maxCompletionsPerUser ?? 1,
      is_active: task?.isActive ?? true,
      order_index: task?.orderIndex ?? 0,
    },
  });

  const taskType = watch("task_type");

  async function onSubmit(data: TaskFormValues) {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        project_id: projectId,
        title: data.title,
        description: data.description || null,
        task_type: data.task_type,
        completion_points: data.completion_points,
        max_completions_per_user: unlimited ? null : data.max_completions_per_user,
        period_type: periodType !== "none" ? periodType : null,
        period_limit: periodType !== "none" ? periodLimit : null,
        allow_batch_submission: allowBatch,
        requires_evidence: false,
        is_active: data.is_active,
        order_index: data.order_index,
        form_schema: data.task_type === "form" ? formSchema : null,
        location_data: data.task_type === "location" ? locationData : null,
      };

      if (task?.id) {
        const { error } = await supabase
          .from("tasks")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", task.id);
        if (error) throw error;
        toast.success(L.forms.task.toastUpdated);
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
        toast.success(L.forms.task.toastCreated);
      }
      onSuccess?.();
    } catch {
      toast.error(L.forms.task.toastSaveFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!task?.id || !confirm(L.forms.task.deleteConfirm)) return;
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error(L.forms.task.toastDeleteFailed);
    } else {
      toast.success(L.forms.task.toastDeleted);
      onSuccess?.(true);
    }
    setDeleting(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Basic fields */}
      <div className="space-y-1.5">
        <Label htmlFor="title">{L.forms.task.titleLabel}</Label>
        <Input id="title" {...register("title")} placeholder={L.forms.task.titlePlaceholder} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">{L.forms.task.descriptionLabel}</Label>
        <Textarea id="description" {...register("description")} placeholder={L.forms.task.descriptionPlaceholder} rows={2} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>{L.forms.task.typeLabel}</Label>
          <Select
            defaultValue={task?.taskType ?? "standard"}
            onValueChange={(v) => setValue("task_type", v as "standard" | "form" | "location" | "photo")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">{L.forms.task.typeStandard}</SelectItem>
              <SelectItem value="form">{L.forms.task.typeForm}</SelectItem>
              <SelectItem value="location">{L.forms.task.typeLocation}</SelectItem>
              <SelectItem value="photo">{L.forms.task.typePhoto}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="points">{L.forms.task.pointsLabel}</Label>
          <Input id="points" type="number" min="0" {...register("completion_points")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max_completions">{L.forms.task.maxPerUserLabel}</Label>
          <Input
            id="max_completions"
            type="number"
            min="1"
            placeholder="1"
            disabled={unlimited}
            {...register("max_completions_per_user")}
            className={unlimited ? "opacity-40" : ""}
          />
          <div className="flex items-center gap-2 pt-0.5">
            <Switch
              id="unlimited"
              checked={unlimited}
              onCheckedChange={(v) => {
                setUnlimited(v);
                if (v) setValue("max_completions_per_user", null);
                else setValue("max_completions_per_user", 1);
              }}
            />
            <Label htmlFor="unlimited" className="text-xs font-normal text-muted-foreground cursor-pointer">{L.forms.task.unlimitedLabel}</Label>
          </div>
        </div>
      </div>

      {/* Period limit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{L.forms.task.periodTypeLabel}</Label>
          <Select
            value={periodType}
            onValueChange={(v) => setPeriodType(v as "none" | "day" | "week")}
          >
            <SelectTrigger>
              <SelectValue placeholder={L.forms.task.periodTypeNone} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{L.forms.task.periodTypeNone}</SelectItem>
              <SelectItem value="day">{L.forms.task.periodTypeDay}</SelectItem>
              <SelectItem value="week">{L.forms.task.periodTypeWeek}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {periodType !== "none" && (
          <div className="space-y-1.5">
            <Label htmlFor="period_limit">{L.forms.task.periodLimitLabel}</Label>
            <Input
              id="period_limit"
              type="number"
              min="1"
              value={periodLimit}
              onChange={(e) => setPeriodLimit(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        )}
      </div>

      {/* Batch submission */}
      <div className="flex items-center gap-3">
        <Switch id="allow_batch" checked={allowBatch} onCheckedChange={setAllowBatch} />
        <Label htmlFor="allow_batch" className="font-normal cursor-pointer">
          {L.forms.task.batchSubmissionLabel}
        </Label>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_active"
          checked={watch("is_active")}
          onCheckedChange={(v) => setValue("is_active", v)}
        />
        <Label htmlFor="is_active" className="font-normal cursor-pointer">
          {L.forms.task.activeLabel}
        </Label>
      </div>

      {/* Type-specific config */}
      {taskType === "form" && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">{L.forms.task.formFieldsHeading}</h3>
            <FormSchemaBuilder schema={formSchema} onChange={setFormSchema} />
          </div>
        </>
      )}

      {taskType === "location" && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">{L.forms.task.locationConfigHeading}</h3>
            <LocationDataBuilder data={locationData} onChange={setLocationData} />
          </div>
        </>
      )}

      {taskType === "photo" && (
        <>
          <Separator />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Camera className="h-4 w-4 shrink-0 text-orange-500" />
            {L.forms.task.photoHint}
          </div>
        </>
      )}

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : task ? L.forms.task.submitUpdate : L.forms.task.submitCreate}
        </Button>
        {task && (
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting} size="icon">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </form>
  );
}
