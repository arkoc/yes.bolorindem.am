import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  // Get current user and check if admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["admin", "leader"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("pm_nominations")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting nomination:", error);
    return NextResponse.json(
      { error: "Failed to delete nomination" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
