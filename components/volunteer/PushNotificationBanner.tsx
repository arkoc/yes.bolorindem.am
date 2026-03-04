"use client";

import { useState, useEffect } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "@/lib/labels";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationBanner() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function detect() {
      if (!("serviceWorker" in navigator)) return;

      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as { MSStream?: unknown }).MSStream;

      if (isIOS) {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as { standalone?: boolean }).standalone === true;
        if (!isStandalone) return; // iOS non-standalone: handled by PushNotificationCard on profile
      }

      if (!("Notification" in window)) return;
      if (Notification.permission !== "default") return;

      // Already has an active subscription — no need to prompt
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
      if (sub) return;

      setShow(true);
    }
    detect();
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setShow(false); return; }

      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ).buffer as ArrayBuffer,
      });

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      });

      setShow(false);
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
    setLoading(false);
  }

  if (!show || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="p-1.5 rounded-full bg-blue-100 shrink-0">
        <Bell className="h-4 w-4 text-blue-600" />
      </div>
      <p className="flex-1 text-sm text-blue-800 font-medium">{L.volunteer.dashboard.pushBannerText}</p>
      <Button
        size="sm"
        className="shrink-0 h-8 text-xs bg-blue-600 hover:bg-blue-700"
        onClick={handleEnable}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : L.volunteer.dashboard.pushBannerEnable}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
