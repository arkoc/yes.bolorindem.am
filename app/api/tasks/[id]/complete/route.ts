import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { completionSchema } from "@/lib/validations/completion";
import { type FormSchema, type TaskLocationData } from "@/lib/db/schema";

/** Haversine distance in meters between two lat/lng coordinates. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  // Fetch task + completion counts in parallel (3 independent DB round-trips → 1)
  const [
    { data: task, error: taskError },
    { count: userCompletionCount },
    { count: userTotalCount },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, project_id, task_type, completion_points, max_completions_per_user, total_completions_allowed, requires_evidence, form_schema, location_data, is_active, period_type, period_limit, allow_batch_submission")
      .eq("id", taskId)
      .single(),
    supabase
      .from("task_completions")
      .select("id", { count: "exact" })
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .eq("status", "approved"),
    supabase
      .from("task_completions")
      .select("id", { count: "exact" })
      .eq("task_id", taskId)
      .eq("user_id", user.id),
  ]);

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!task.is_active) {
    return NextResponse.json({ error: "Task is not active" }, { status: 400 });
  }

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

  // Check period-based limit (per day or per week)
  if (task.period_type) {
    const periodLimit = task.period_limit ?? 1;
    const now = new Date();
    let windowStart: Date;
    if (task.period_type === "day") {
      windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      // week: Monday-based
      const day = now.getDay(); // 0=Sun
      const diff = (day === 0 ? -6 : 1 - day);
      windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    }

    const { count: periodCount } = await supabase
      .from("task_completions")
      .select("id", { count: "exact" })
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("completed_at", windowStart.toISOString());

    const periodCompletions = periodCount ?? 0;
    if (periodCompletions >= periodLimit) {
      const periodLabel = task.period_type === "day" ? "today" : "this week";
      return NextResponse.json(
        { error: `You have reached the limit of ${periodLimit} completion(s) ${periodLabel} for this task.` },
        { status: 409 }
      );
    }
    if (batchCount > 1 && periodCompletions + batchCount > periodLimit) {
      return NextResponse.json(
        { error: `You can only complete this task ${periodLimit - periodCompletions} more time(s) ${task.period_type === "day" ? "today" : "this week"}.` },
        { status: 409 }
      );
    }
  }

  // Validate proximity for location tasks
  if (task.task_type === "location" && payload.taskType === "location") {
    const locationData = task.location_data as TaskLocationData | null;
    const submitted = payload.locationData;
    if (locationData?.targetPoints?.length && submitted?.selectedPointId) {
      const point = locationData.targetPoints.find((p) => p.id === submitted.selectedPointId);
      if (point?.radiusMeters) {
        const dist = haversineMeters(submitted.lat, submitted.lng, point.lat, point.lng);
        if (dist > point.radiusMeters) {
          return NextResponse.json(
            { error: `You are ${Math.round(dist)}m from the target location (max ${point.radiusMeters}m allowed).` },
            { status: 422 }
          );
        }
      }
    }
  }

  // Check per-point limit for location tasks
  if (task.task_type === "location" && payload.taskType === "location") {
    const selectedPointId = payload.locationData?.selectedPointId;
    if (selectedPointId) {
      const locationData = task.location_data as TaskLocationData | null;
      const point = locationData?.targetPoints?.find((p) => p.id === selectedPointId);
      if (point?.maxCompletions) {
        // Count completions at this specific point using DB-side JSONB filter
        const { count: pointCount } = await supabase
          .from("task_completions")
          .select("id", { count: "exact" })
          .eq("task_id", taskId)
          .eq("user_id", user.id)
          .eq("status", "approved")
          .filter("location_data->>'selectedPointId'", "eq", selectedPointId);

        if ((pointCount ?? 0) >= point.maxCompletions) {
          return NextResponse.json(
            { error: `You've reached the limit of ${point.maxCompletions} check-in(s) at "${point.label}".` },
            { status: 409 }
          );
        }
      }
    }
  }

  // Note: total_completions_allowed is now enforced atomically by the
  // guard_task_capacity BEFORE INSERT trigger in migration 019.
  // The application-level check has been removed to eliminate the TOCTOU race condition.

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
      if (insertError.message?.includes("task_at_capacity")) {
        return NextResponse.json(
          { error: "This task has reached its maximum completions." },
          { status: 409 }
        );
      }
      console.error("Completion insert error:", insertError);
      return NextResponse.json({ error: "Failed to record completion." }, { status: 500 });
    }
    lastCompletion = data;
  }

  // Fetch updated profile points (trigger has already updated total_points atomically)
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
