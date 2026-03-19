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
  const { data, error } = await admin.rpc("creator_reject_completion", {
    p_completion_id: completionId,
    p_creator_id:    user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.ok) return NextResponse.json({ error: data.reason }, { status: 422 });

  return NextResponse.json({ ok: true });
}
