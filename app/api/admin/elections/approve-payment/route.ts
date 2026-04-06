import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const adminClient = createAdminClient();

  // Fetch the registration being approved
  const { data: reg } = await adminClient
    .from("election_registrations")
    .select("id, user_id, type")
    .eq("id", id)
    .eq("payment_status", "pending")
    .single();

  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await adminClient
    .from("election_registrations")
    .update({ payment_status: "paid", status: "approved" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approving a candidate who was previously a voter, delete the voter row
  if (reg.type === "candidate") {
    await adminClient
      .from("election_registrations")
      .delete()
      .eq("user_id", reg.user_id)
      .eq("type", "voter");
  }

  return NextResponse.json({ success: true });
}
