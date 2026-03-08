import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
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

  const { bio, social_url } = body as { bio?: string; social_url?: string };

  if (bio && bio.trim().length > 150) {
    return NextResponse.json({ error: "Bio must be 150 characters or less" }, { status: 400 });
  }

  // Validate social_url if provided
  if (social_url && social_url.trim() !== "") {
    try {
      const url = new URL(social_url.trim());
      if (!["http:", "https:"].includes(url.protocol)) {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  // Read current bonus state before update
  const { data: before } = await supabase
    .from("profiles")
    .select("profile_completion_bonus_awarded")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      bio: bio?.trim() || null,
      social_url: social_url?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  // Check if bonus was just awarded by the trigger
  const { data: after } = await supabase
    .from("profiles")
    .select("profile_completion_bonus_awarded")
    .eq("id", user.id)
    .single();

  const bonusJustAwarded =
    before?.profile_completion_bonus_awarded === false &&
    after?.profile_completion_bonus_awarded === true;

  return NextResponse.json({ success: true, bonus_awarded: bonusJustAwarded });
}
