"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellOff, Loader2, Share, Plus } from "lucide-react";
import L from "@/lib/labels";

type Step = "detecting" | "ios-guide" | "push" | "unsupported";

function detectEnvironment(): Step {
  if (!("serviceWorker" in navigator)) return "unsupported";

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream;

  if (isIOS) {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    return isStandalone ? "push" : "ios-guide";
  }

  if (!("Notification" in window)) return "unsupported";
  return "push";
}
// Note: iOS check must come before Notification check — on iOS < 16.4,
// Notification is not in window, but we still want to show the Add to Home Screen guide.

export function PushPermissionStep() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("detecting");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const detected = detectEnvironment();
    if (detected === "unsupported") {
      router.push("/dashboard");
    } else {
      setStep(detected);
    }
  }, [router]);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        router.push("/dashboard");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

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
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
    router.push("/dashboard");
  }

  if (step === "detecting") return null;

  if (step === "ios-guide") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
            <div className="p-4 rounded-full bg-primary/10">
              <Bell className="h-10 w-10 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">{L.auth.push.iosTitle}</h2>
              <p className="text-sm text-muted-foreground">{L.auth.push.iosDescription}</p>
            </div>

            <div className="w-full space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">1</span>
                <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                  {L.auth.push.iosStep1a}
                  <Share className="h-4 w-4 text-blue-500 inline shrink-0" />
                  {L.auth.push.iosStep1b}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">2</span>
                <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                  {L.auth.push.iosStep2a}
                  <Plus className="h-4 w-4 inline shrink-0" />
                  {L.auth.push.iosStep2b}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">3</span>
                <p className="text-sm text-muted-foreground">{L.auth.push.iosStep3}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => router.push("/dashboard")}
            >
              <BellOff className="h-4 w-4 mr-2" />
              {L.auth.push.skip}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
          <div className="p-4 rounded-full bg-primary/10">
            <Bell className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">{L.auth.push.title}</h2>
            <p className="text-sm text-muted-foreground">{L.auth.push.description}</p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button
              className="w-full h-12 text-base"
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  {L.auth.push.enable}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground"
              onClick={() => router.push("/dashboard")}
              disabled={loading}
            >
              <BellOff className="h-4 w-4 mr-2" />
              {L.auth.push.skip}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
