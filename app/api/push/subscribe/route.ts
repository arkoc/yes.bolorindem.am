import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();

  // Try cookie-based auth first; fall back to Bearer token.
  // Bearer fallback is needed for new users right after registration
  // where the auth cookie may not be set yet on the server.
  let userId: string | null = null;

  const supabase = await createServerClient();
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) {
    userId = cookieUser.id;
  } else {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      const { data: { user: tokenUser } } = await adminClient.auth.getUser(token);
      if (tokenUser) userId = tokenUser.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, p256dh, auth } = body as Record<string, string>;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const { error } = await adminClient
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint, p256dh, auth },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("[push/subscribe] upsert error:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  // Award one-time bonus on first notification subscription
  const { data: profile } = await adminClient
    .from("profiles")
    .select("notification_bonus_awarded")
    .eq("id", userId)
    .single();

  if (profile && !profile.notification_bonus_awarded) {
    await adminClient
      .from("profiles")
      .update({ notification_bonus_awarded: true })
      .eq("id", userId);

    await adminClient.rpc("award_points", {
      p_user_id: userId,
      p_amount: 100,
      p_source_type: "admin_grant",
      p_source_id: null,
      p_description: "Ծանուցումների ակտիվացման բոնուս",
    });
  }

  return NextResponse.json({ success: true, bonusAwarded: profile && !profile.notification_bonus_awarded });
}
