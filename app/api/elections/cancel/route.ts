import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await req.json();
  if (type !== "voter" && type !== "candidate") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("election_registrations")
    .delete()
    .eq("user_id", user.id)
    .eq("type", type);

  if (error) {
    console.error("Cancel registration error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
