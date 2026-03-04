import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type SendPushResult = "ok" | "expired" | "error";

export async function sendPush(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<SendPushResult> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 410 || status === 404) return "expired";
    console.error("Push send error:", status, err);
    return "error";
  }
}
