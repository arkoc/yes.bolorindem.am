import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { completionSchema } from "@/lib/validations/completion";
import { type FormSchema, type TaskLocationData } from "@/lib/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createServerClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = completionSchema.safeParse({ ...body as Record<string, unknown>, taskId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const payload = parsed.data;

  // Fetch task
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, project_id, task_type, completion_points, max_completions_per_user, total_completions_allowed, requires_evidence, form_schema, location_data, is_active")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!task.is_active) {
    return NextResponse.json({ error: "Task is not active" }, { status: 400 });
  }

  // Check user's approved completion count (for limit enforcement)
  const { count: userCompletionCount } = await supabase
    .from("task_completions")
    .select("id", { count: "exact" })
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .eq("status", "approved");

  // Total completion count across all statuses (for unique completion_number)
  const { count: userTotalCount } = await supabase
    .from("task_completions")
    .select("id", { count: "exact" })
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  const currentCount = userCompletionCount ?? 0;
  const nextNumber = userTotalCount ?? 0;
  const batchCount = "count" in payload ? (payload.count ?? 1) : 1;

  if (task.max_completions_per_user !== null && currentCount >= task.max_completions_per_user) {
    return NextResponse.json(
      { error: "You have already completed this task the maximum number of times." },
      { status: 409 }
    );
  }

  if (batchCount > 1 && task.max_completions_per_user !== null && currentCount + batchCount > task.max_completions_per_user) {
    return NextResponse.json(
      { error: `You can only complete this task ${task.max_completions_per_user - currentCount} more time(s).` },
      { status: 409 }
    );
  }

  // Check per-point limit for location tasks
  if (task.task_type === "location" && payload.taskType === "location") {
    const selectedPointId = payload.locationData?.selectedPointId;
    if (selectedPointId) {
      const locationData = task.location_data as TaskLocationData | null;
      const point = locationData?.targetPoints?.find((p) => p.id === selectedPointId);
      if (point?.maxCompletions) {
        // Count this user's approved completions at this specific point
        const { data: prevCompletions } = await supabase
          .from("task_completions")
          .select("location_data")
          .eq("task_id", taskId)
          .eq("user_id", user.id)
          .eq("status", "approved");

        const pointCount = (prevCompletions ?? []).filter(
          (c) => (c.location_data as { selectedPointId?: string } | null)?.selectedPointId === selectedPointId
        ).length;

        if (pointCount >= point.maxCompletions) {
          return NextResponse.json(
            { error: `You've reached the limit of ${point.maxCompletions} check-in(s) at "${point.label}".` },
            { status: 409 }
          );
        }
      }
    }
  }

  // Check total completions allowed (across all users)
  if (task.total_completions_allowed !== null) {
    const { count: totalCount } = await supabase
      .from("task_completions")
      .select("id", { count: "exact" })
      .eq("task_id", taskId)
      .eq("status", "approved");

    if ((totalCount ?? 0) >= task.total_completions_allowed) {
      return NextResponse.json(
        { error: "This task has reached its maximum completions." },
        { status: 409 }
      );
    }
  }

  // Validate form data for form tasks
  if (task.task_type === "form" && payload.taskType === "form") {
    const schema = task.form_schema as FormSchema | null;
    if (schema?.fields) {
      for (const field of schema.fields) {
        if (field.required) {
          const value = payload.formData[field.id];
          if (value === undefined || value === null || value === "") {
            return NextResponse.json(
              { error: `Field "${field.label}" is required.` },
              { status: 422 }
            );
          }
        }
      }
    }
  }

  // Build base completion record
  const baseData: Record<string, unknown> = {
    task_id: taskId,
    user_id: user.id,
    status: "approved",
    points_awarded: task.completion_points,
  };

  if (payload.taskType === "form") baseData.form_data = payload.formData;
  if (payload.taskType === "location") baseData.location_data = payload.locationData;
  if (payload.taskType === "photo") baseData.evidence_urls = payload.evidenceUrls;
  if ("notes" in payload && payload.notes) baseData.notes = payload.notes;

  // Insert completions sequentially (triggers fire per-row for atomic point updates)
  let lastCompletion: { id: string; points_awarded: number; completion_number: number } | null = null;
  for (let i = 0; i < batchCount; i++) {
    const { data, error: insertError } = await supabase
      .from("task_completions")
      .insert({ ...baseData, completion_number: nextNumber + i + 1 })
      .select("id, points_awarded, completion_number")
      .single();

    if (insertError) {
      console.error("Completion insert error:", insertError);
      return NextResponse.json({ error: "Failed to record completion." }, { status: 500 });
    }
    lastCompletion = data;
  }

  // Fetch updated profile points
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    success: true,
    completion: { ...lastCompletion, points_awarded: task.completion_points * batchCount, count: batchCount },
    newTotalPoints: profile?.total_points ?? 0,
  });
}
