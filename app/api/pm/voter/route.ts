import { createServerClient } from "@/lib/supabase/server";
import { PM_NOMINATION_DEADLINE } from "@/lib/elections-config";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if user is banned
  const { data: profile } = await supabase
    .from("profiles")
    .select("banned")
    .eq("id", user.id)
    .single();

  if (profile?.banned) {
    return NextResponse.json({ error: "Դուք արգելափակվել եք" }, { status: 403 });
  }

  // Check deadline
  if (new Date() >= PM_NOMINATION_DEADLINE) {
    return NextResponse.json({ error: "deadline_passed" }, { status: 403 });
  }

  const { email } = await req.json();
  const trimmedEmail = email?.trim() || null;

  // Upsert voter registration
  const { error } = await supabase.from("pm_voters").upsert(
    {
      user_id: user.id,
      email: trimmedEmail,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error registering voter:", error);
    return NextResponse.json(
      { error: "Failed to register" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check deadline
  if (new Date() >= PM_NOMINATION_DEADLINE) {
    return NextResponse.json({ error: "deadline_passed" }, { status: 403 });
  }

  const { error } = await supabase
    .from("pm_voters")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting voter:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
