"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellOff, Loader2, Share, SquarePlus } from "lucide-react";
import L from "@/lib/labels";
import { usePushNotification } from "@/lib/use-push-notification";

export function PushPermissionStep() {
  const router = useRouter();
  const { state, loading, subscribe } = usePushNotification();

  useEffect(() => {
    if (state === "unsupported" || state === "granted" || state === "denied") {
      router.push("/dashboard");
    }
  }, [state, router]);

  async function handleEnable() {
    await subscribe();
    router.push("/dashboard");
  }

  if (state === "detecting" || state === "unsupported" || state === "granted" || state === "denied") {
    return null;
  }

  if (state === "ios-guide") {
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
                  <SquarePlus className="h-4 w-4 inline shrink-0" />
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

  // state === "default"
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
            <div className="space-y-1">
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
              <p className="text-center text-xs font-semibold text-primary">+100 միավոր բոնուս</p>
            </div>
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
