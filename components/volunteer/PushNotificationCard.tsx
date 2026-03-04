"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellOff, Check, Loader2, Share, Plus } from "lucide-react";
import L from "@/lib/labels";

type State = "detecting" | "unsupported" | "ios-guide" | "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationCard() {
  const [state, setState] = useState<State>("detecting");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function detect() {
      if (!("serviceWorker" in navigator)) { setState("unsupported"); return; }
      if (!("Notification" in window)) { setState("unsupported"); return; }

      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as { MSStream?: unknown }).MSStream;

      if (isIOS) {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as { standalone?: boolean }).standalone === true;
        if (!isStandalone) { setState("ios-guide"); return; }
      }

      const perm = Notification.permission;
      if (perm === "denied") { setState("denied"); return; }
      if (perm === "default") { setState("default"); return; }

      // Permission is granted — verify there's an actual active subscription
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setState(sub ? "granted" : "default");
      } catch {
        setState("default");
      }
    }
    detect();
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); setLoading(false); return; }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ).buffer as ArrayBuffer,
        }));

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      });

      setState("granted");
      setDone(true);
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
    setLoading(false);
  }

  if (state === "detecting" || state === "unsupported") return null;

  if (state === "ios-guide") {
    return (
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-blue-100 shrink-0">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{L.auth.push.iosTitle}</p>
              <p className="text-xs text-muted-foreground">{L.auth.push.iosDescription}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted text-xs text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">1</span>
              <span className="flex items-center gap-1 flex-wrap">{L.auth.push.iosStep1a} <Share className="h-3.5 w-3.5 text-blue-500 inline shrink-0" /> {L.auth.push.iosStep1b}</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted text-xs text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">2</span>
              <span className="flex items-center gap-1 flex-wrap">{L.auth.push.iosStep2a} <Plus className="h-3.5 w-3.5 inline shrink-0" /></span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted text-xs text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">3</span>
              <span>{L.auth.push.iosStep3}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === "granted") {
    return (
      <Card>
        <CardContent className="py-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-green-100 shrink-0">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{L.auth.push.enabled}</p>
            <p className="text-xs text-muted-foreground">{done ? L.auth.push.enabledDesc : L.auth.push.enabledDesc}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === "denied") {
    return (
      <Card>
        <CardContent className="py-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-muted shrink-0">
            <BellOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{L.auth.push.denied}</p>
            <p className="text-xs text-muted-foreground">{L.auth.push.deniedDesc}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // state === "default"
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-blue-100 shrink-0">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{L.auth.push.title}</p>
            <p className="text-xs text-muted-foreground">{L.auth.push.description}</p>
          </div>
        </div>
        <Button className="w-full h-9 text-sm" onClick={handleEnable} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <><Bell className="h-4 w-4 mr-2" />{L.auth.push.enableFromProfile}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
