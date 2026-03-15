import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "leader") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { completionId } = body;
  if (!completionId) return NextResponse.json({ error: "completionId required" }, { status: 400 });

  const { id: bountyId } = await params;

  const { error } = await admin
    .from("bounty_completions")
    .update({ status: "accepted", resolved_at: new Date().toISOString(), resolution: "admin_accepted" })
    .eq("id", completionId)
    .eq("bounty_id", bountyId)
    .eq("status", "disputed");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
