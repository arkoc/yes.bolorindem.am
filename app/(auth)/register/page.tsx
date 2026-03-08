"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Loader2, User } from "lucide-react";
import L from "@/lib/labels";
import { PushPermissionStep } from "@/components/volunteer/PushPermissionStep";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPushStep, setShowPushStep] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(L.auth.register.sessionExpired);
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error(L.auth.register.saveFailed);
    } else {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) {
        await fetch("/api/referral/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: ref }),
        });
      }
      toast.success(L.auth.register.welcome);
      setShowPushStep(true);
      return;
    }
    setLoading(false);
  }

  if (showPushStep) {
    return <PushPermissionStep />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">{L.auth.register.title}</CardTitle>
          <CardDescription>
            {L.auth.register.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar preview */}
            <div className="flex justify-center">
              <div className="rounded-full overflow-hidden border-4 border-primary/20">
                {fullName.trim() ? (
                  <UserAvatar name={fullName.trim()} size={80} />
                ) : (
                  <div className="h-20 w-20 bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{L.auth.register.fullNameLabel}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={L.auth.register.fullNamePlaceholder}
                value={fullName}
                onChange={(e) => setFullName(e.target.value.slice(0, 50))}
                maxLength={50}
                required
                autoFocus
                className="h-12 text-base"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{L.auth.register.avatarHint}</p>
                <p className={`text-xs ${fullName.length >= 45 ? "text-destructive" : "text-muted-foreground"}`}>
                  {fullName.length}/50
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || !fullName.trim()}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                L.auth.register.submit
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
