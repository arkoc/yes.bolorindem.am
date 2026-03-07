import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body as { action?: string };
  if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: poll } = await adminClient
    .from("polls").select("status").eq("id", params.id).single();
  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let newStatus: string;
  if (action === "publish" && poll.status === "draft") {
    newStatus = "active";
  } else if (action === "close" && poll.status === "active") {
    newStatus = "closed";
  } else {
    return NextResponse.json({ error: "Invalid action for current status" }, { status: 400 });
  }

  const { error } = await adminClient
    .from("polls")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: "Failed to update poll" }, { status: 500 });

  return NextResponse.json({ status: newStatus });
}
