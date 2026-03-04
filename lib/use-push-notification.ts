"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push-subscribe";

export type PushState =
  | "detecting"
  | "unsupported"
  | "ios-guide"
  | "default"
  | "granted"
  | "denied";

export function usePushNotification() {
  const [state, setState] = useState<PushState>("detecting");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function detect() {
      if (!("serviceWorker" in navigator)) { setState("unsupported"); return; }

      // iOS check BEFORE Notification check —
      // iOS < 16.4 has no Notification API but we still want to show the guide.
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as { MSStream?: unknown }).MSStream;

      if (isIOS) {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as { standalone?: boolean }).standalone === true;
        if (!isStandalone) { setState("ios-guide"); return; }
      }

      if (!("Notification" in window)) { setState("unsupported"); return; }

      const perm = Notification.permission;
      if (perm === "denied") { setState("denied"); return; }
      if (perm === "default") { setState("default"); return; }

      // Permission already granted — verify active subscription and re-sync to DB
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!sub) { setState("default"); return; }

        const { endpoint, keys } = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
        });

        setState("granted");
      } catch {
        setState("default");
      }
    }
    detect();
  }, []);

  async function subscribe(): Promise<"granted" | "denied" | "error"> {
    setLoading(true);
    const result = await subscribeToPush();
    if (result === "granted") setState("granted");
    else if (result === "denied") setState("denied");
    setLoading(false);
    return result;
  }

  return { state, loading, subscribe };
}
