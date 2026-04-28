import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = await createServerClient();
  const adminClient = createAdminClient();

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "leader"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reason } = await req.json();

  // Ban user
  const { error } = await adminClient
    .from("profiles")
    .update({
      banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason || null,
    })
    .eq("id", params.userId);

  if (error) {
    console.error("Error banning user:", error);
    return NextResponse.json(
      { error: "Failed to ban user" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const supabase = await createServerClient();
  const adminClient = createAdminClient();

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "leader"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Unban user
  const { error } = await adminClient
    .from("profiles")
    .update({
      banned: false,
      banned_at: null,
      ban_reason: null,
    })
    .eq("id", params.userId);

  if (error) {
    console.error("Error unbanning user:", error);
    return NextResponse.json(
      { error: "Failed to unban user" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
