import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = (body as Record<string, unknown>).code;
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  // Check current user hasn't already been referred
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();

  if (currentProfile?.referred_by) {
    return NextResponse.json({ error: "Already referred" }, { status: 409 });
  }

  // Look up the referrer by code
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", code.toUpperCase())
    .single();

  if (!referrer) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }

  if (referrer.id === user.id) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // Set referred_by using admin client (trigger will award points to referrer)
  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", user.id);

  if (updateError) {
    console.error("Referral record error:", updateError);
    return NextResponse.json({ error: "Failed to record referral" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
