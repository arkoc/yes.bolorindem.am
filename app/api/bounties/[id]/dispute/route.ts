import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bountyId } = await params;
  const body = await req.json().catch(() => ({}));
  const { completionId } = body;

  if (!completionId) return NextResponse.json({ error: "completionId required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: bounty } = await admin
    .from("user_bounties")
    .select("creator_id")
    .eq("id", bountyId)
    .single();

  if (!bounty) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bounty.creator_id !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { error } = await admin
    .from("bounty_completions")
    .update({ status: "disputed", resolved_at: new Date().toISOString(), resolution: "disputed" })
    .eq("id", completionId)
    .eq("bounty_id", bountyId)
    .eq("status", "accepted");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
