import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { option_ids } = body as { option_ids?: string[] };
  if (!option_ids || option_ids.length === 0) {
    return NextResponse.json({ error: "option_ids required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Fetch poll
  const { data: poll } = await adminClient
    .from("polls")
    .select("id, status, allow_multiple, expires_at, points_per_vote")
    .eq("id", params.id)
    .single();

  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  // Check poll is active and not expired
  if (poll.status !== "active") {
    return NextResponse.json({ error: "poll_closed" }, { status: 400 });
  }
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return NextResponse.json({ error: "poll_expired" }, { status: 400 });
  }

  // Check for single-select: user may not have voted on this poll yet
  if (!poll.allow_multiple) {
    if (option_ids.length > 1) {
      return NextResponse.json({ error: "Only one option allowed" }, { status: 400 });
    }
    const { count } = await adminClient
      .from("poll_votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", params.id)
      .eq("user_id", user.id);
    if (count && count > 0) {
      return NextResponse.json({ error: "already_voted" }, { status: 400 });
    }
  }

  // Validate all option_ids belong to this poll
  const { data: validOptions } = await adminClient
    .from("poll_options")
    .select("id")
    .eq("poll_id", params.id)
    .in("id", option_ids);

  if (!validOptions || validOptions.length !== option_ids.length) {
    return NextResponse.json({ error: "Invalid options" }, { status: 400 });
  }

  // Insert votes
  const rows = option_ids.map((option_id) => ({
    poll_id: params.id,
    option_id,
    user_id: user.id,
  }));

  const { error } = await adminClient.from("poll_votes").insert(rows);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_voted" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit vote" }, { status: 500 });
  }

  // Award points for voting (once per poll, regardless of options count)
  const pts = poll.points_per_vote ?? 0;
  if (pts > 0) {
    const { error: rpcError } = await adminClient.rpc("award_points", {
      p_user_id: user.id,
      p_amount: pts,
      p_source_type: "poll_vote",
      p_source_id: params.id,
      p_description: "Քvearakutyun",
      p_created_by: null,
    });
    if (rpcError) console.error("award_points failed for poll vote:", rpcError);
  }

  return NextResponse.json({ success: true, points_awarded: pts });
}
