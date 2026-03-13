"use client";

import { useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "@/lib/labels";
import { toast } from "sonner";
import { usePushNotification } from "@/lib/use-push-notification";

export function PushNotificationBanner() {
  const { state, loading, subscribe } = usePushNotification();
  const [dismissed, setDismissed] = useState(false);

  // Hide when: still detecting, not applicable (unsupported/ios-guide), or already granted
  if (dismissed || state === "detecting" || state === "unsupported" || state === "ios-guide" || state === "granted") {
    return null;
  }

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
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <Button
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={async () => { const r = await subscribe(); if (r === "error") toast.error("Failed to enable notifications"); }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : L.volunteer.dashboard.pushBannerEnable}
          </Button>
          <span className="text-[10px] font-semibold text-blue-600">+100 միավոր</span>
        </div>
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
