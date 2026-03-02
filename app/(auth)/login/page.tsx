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
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import L, { t } from "@/lib/labels";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const normalized = `+374${phone.replace(/\D/g, "")}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(L.auth.login.codeSent);
      setPhone(normalized);
      setStep("otp");
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Check if profile is set up (has a real name)
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .single();

      if (!profile?.full_name || profile.full_name === "New Volunteer") {
        router.push("/register");
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
            <Phone className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">{L.auth.login.title}</CardTitle>
          <CardDescription>
            {step === "phone"
              ? L.auth.login.subtitlePhone
              : t(L.auth.login.subtitleOtp, { phone })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{L.auth.login.phoneLabel}</Label>
                <div className="flex h-12 rounded-md border border-input overflow-hidden">
                  <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-input select-none">
                    +374
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={L.auth.login.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                    className="text-lg h-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || !phone}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {L.auth.login.sendCode} <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">{L.auth.login.otpLabel}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={L.auth.login.otpPlaceholder}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                  className="text-2xl h-14 tracking-widest text-center"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {L.auth.login.verify} <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("phone"); setOtp(""); }}
              >
                {L.auth.login.backLink}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
