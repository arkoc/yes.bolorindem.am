"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2, Send } from "lucide-react";
import L from "@/lib/labels";

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("/dashboard");
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, url }),
      });
      const data = await res.json() as { sent?: number; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? L.admin.notifications.sendFailed);
      } else {
        toast.success(`${L.admin.notifications.sendSuccess} (${data.sent} ${L.admin.notifications.recipients})`);
        setTitle("");
        setMessage("");
        setUrl("/dashboard");
      }
    } catch {
      toast.error(L.admin.notifications.sendFailed);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          {L.admin.notifications.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{L.admin.notifications.subtitle}</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{L.admin.notifications.formTitle}</CardTitle>
          <CardDescription>{L.admin.notifications.formDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{L.admin.notifications.titleLabel}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={L.admin.notifications.titlePlaceholder}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">{L.admin.notifications.messageLabel}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={L.admin.notifications.messagePlaceholder}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">{L.admin.notifications.urlLabel}</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/dashboard"
              />
              <p className="text-xs text-muted-foreground">{L.admin.notifications.urlHint}</p>
            </div>

            <Button type="submit" disabled={loading || !title.trim() || !message.trim()} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {L.admin.notifications.sendBtn}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
