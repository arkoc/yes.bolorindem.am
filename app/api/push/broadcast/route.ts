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

  // Fetch all subscriptions — Supabase default limit is 1000, use range to paginate
  const allSubs: (PushSubscriptionData & { id: string })[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await adminClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    if (!data?.length) break;
    allSubs.push(...(data as (PushSubscriptionData & { id: string })[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  if (!allSubs.length) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = { title: title.trim(), body: message.trim(), url: url?.trim() || "/dashboard" };

  // Send in batches of 50, track expired subscriptions for cleanup
  let sent = 0;
  const expiredIds: string[] = [];
  const batchSize = 50;
  for (let i = 0; i < allSubs.length; i += batchSize) {
    const batch = allSubs.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((sub) => sendPush(sub, payload)));
    results.forEach((result, idx) => {
      if (result === "ok") sent++;
      else if (result === "expired") expiredIds.push(batch[idx].id);
    });
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await adminClient.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return NextResponse.json({ sent, expired: expiredIds.length });
}
