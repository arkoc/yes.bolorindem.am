import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { sendPush, PushSubscriptionData } from "@/lib/push";
import L, { t } from "@/lib/labels";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, allow_multiple, expires_at, notify_on_publish, options, publish, points_per_vote } =
    body as {
      title?: string;
      description?: string;
      allow_multiple?: boolean;
      expires_at?: string;
      notify_on_publish?: boolean;
      options?: string[];
      publish?: boolean;
      points_per_vote?: number;
    };

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const validOptions = (options ?? []).map((o) => o.trim()).filter(Boolean);
  if (validOptions.length < 2) {
    return NextResponse.json({ error: "At least 2 options required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const status = publish ? "active" : "draft";

  const { data: poll, error: pollError } = await adminClient
    .from("polls")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      allow_multiple: allow_multiple ?? false,
      expires_at: expires_at || null,
      notify_on_publish: notify_on_publish ?? false,
      points_per_vote: Math.max(0, Math.floor(points_per_vote ?? 0)),
      status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
  }

  const optionRows = validOptions.map((text, i) => ({
    poll_id: poll.id,
    text,
    order_index: i,
  }));

  const { error: optionsError } = await adminClient.from("poll_options").insert(optionRows);
  if (optionsError) {
    return NextResponse.json({ error: "Failed to create options" }, { status: 500 });
  }

  // Broadcast push notification if publishing with notify enabled
  if (status === "active" && notify_on_publish) {
    try {
      const allSubs: (PushSubscriptionData & { id: string })[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data } = await adminClient
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .range(from, from + pageSize - 1);
        if (!data?.length) break;
        allSubs.push(...(data as (PushSubscriptionData & { id: string })[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      if (allSubs.length > 0) {
        const hoursLeft = expires_at
          ? Math.round((new Date(expires_at).getTime() - Date.now()) / 3_600_000)
          : null;
        const notifyBody = hoursLeft !== null
          ? t(L.admin.voting.pollNotifyTitle, { hours: hoursLeft })
          : L.admin.voting.pollNotifyTitle;
        const payload = {
          title: title.trim(),
          body: notifyBody,
          url: `/voting/${poll.id}`,
        };
        const expiredIds: string[] = [];
        for (let i = 0; i < allSubs.length; i += 50) {
          const batch = allSubs.slice(i, i + 50);
          const results = await Promise.all(batch.map((sub) => sendPush(sub, payload)));
          results.forEach((r, idx) => { if (r === "expired") expiredIds.push(batch[idx].id); });
        }
        if (expiredIds.length > 0) {
          await adminClient.from("push_subscriptions").delete().in("id", expiredIds);
        }
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }
  }

  return NextResponse.json({ id: poll.id });
}
