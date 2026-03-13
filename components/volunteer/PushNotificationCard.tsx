"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellOff, Check, Loader2, Share, SquarePlus } from "lucide-react";
import L from "@/lib/labels";
import { toast } from "sonner";
import { usePushNotification } from "@/lib/use-push-notification";

export function PushNotificationCard() {
  const { state, loading, subscribe } = usePushNotification();
  const [done, setDone] = useState(false);

  async function handleEnable() {
    const result = await subscribe();
    if (result === "granted") setDone(true);
    else if (result === "error") toast.error("Failed to enable notifications");
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
              <span className="flex items-center gap-1 flex-wrap">{L.auth.push.iosStep2a} <SquarePlus className="h-3.5 w-3.5 inline shrink-0" /></span>
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
            <><Bell className="h-4 w-4 mr-2" />{L.auth.push.enableFromProfile} · +100 միավոր</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
