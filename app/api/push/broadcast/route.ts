import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { sendPush, PushSubscriptionData } from "@/lib/push";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, message, url } = body as Record<string, string>;
  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data: subs, error: subsError } = await adminClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (subsError) {
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }

  if (!subs?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = { title: title.trim(), body: message.trim(), url: url?.trim() || "/dashboard" };

  // Send in batches of 50 to avoid overwhelming the push service
  let sent = 0;
  const batchSize = 50;
  for (let i = 0; i < subs.length; i += batchSize) {
    const batch = subs.slice(i, i + batchSize) as PushSubscriptionData[];
    await Promise.all(batch.map((sub) => sendPush(sub, payload).then(() => sent++).catch(() => {})));
  }

  return NextResponse.json({ sent });
}
