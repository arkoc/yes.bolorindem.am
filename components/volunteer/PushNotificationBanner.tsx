"use client";

import { useState, useEffect } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "@/lib/labels";
import { subscribeToPush } from "@/lib/push-subscribe";

type BannerState = "default" | "denied";

export function PushNotificationBanner() {
  const [state, setState] = useState<BannerState | null>(null);
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
        if (!isStandalone) return;
      }

      if (!("Notification" in window)) return;

      const perm = Notification.permission;

      if (perm === "denied") {
        setState("denied");
        return;
      }

      if (perm === "granted") {
        // Already granted — check if actually subscribed
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
        const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
        if (sub) return; // subscribed and active — no banner needed
        // Granted but no subscription — treat as default
      }

      setState("default");
    }
    detect();
  }, []);

  async function handleEnable() {
    setLoading(true);
    const result = await subscribeToPush();
    if (result === "granted") {
      setState(null);
    } else if (result === "denied") {
      setState("denied");
    }
    setLoading(false);
  }

  if (!state || dismissed) return null;

  const denied = state === "denied";

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${denied ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50"}`}>
      <div className={`p-1.5 rounded-full shrink-0 ${denied ? "bg-orange-100" : "bg-blue-100"}`}>
        <Bell className={`h-4 w-4 ${denied ? "text-orange-600" : "text-blue-600"}`} />
      </div>
      <p className={`flex-1 text-sm font-medium ${denied ? "text-orange-800" : "text-blue-800"}`}>
        {denied ? L.volunteer.dashboard.pushBannerDeniedText : L.volunteer.dashboard.pushBannerText}
      </p>
      {denied ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
          onClick={() => window.open("app-settings:", "_blank")}
        >
          {L.volunteer.dashboard.pushBannerOpenSettings}
        </Button>
      ) : (
        <Button
          size="sm"
          className="shrink-0 h-8 text-xs bg-blue-600 hover:bg-blue-700"
          onClick={handleEnable}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : L.volunteer.dashboard.pushBannerEnable}
        </Button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={`shrink-0 transition-colors ${denied ? "text-orange-400 hover:text-orange-600" : "text-blue-400 hover:text-blue-600"}`}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
