import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, proofHint, rewardPoints, isRepeatable, maxCompletions, expiresAt } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (typeof rewardPoints !== "number" || rewardPoints < 10) {
    return NextResponse.json({ error: "Minimum reward is 10 points" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_user_bounty", {
    p_creator_id:      user.id,
    p_title:           title.trim(),
    p_description:     description.trim(),
    p_proof_hint:      proofHint?.trim() || null,
    p_reward_points:   rewardPoints,
    p_is_repeatable:   isRepeatable ?? false,
    p_max_completions: isRepeatable && maxCompletions >= 2 ? maxCompletions : null,
    p_expires_at:      expiresAt || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.ok) return NextResponse.json({ error: data.reason }, { status: 422 });

  return NextResponse.json({ id: data.id });
}
