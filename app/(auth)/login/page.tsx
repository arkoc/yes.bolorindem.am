"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import L, { t } from "@/lib/labels";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 8;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid) return;
    setLoading(true);

    const normalized = `+374${phoneDigits}`;
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

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .single();

      if (!profile?.full_name || profile.full_name === "New Volunteer") {
        const ref = new URLSearchParams(window.location.search).get("ref");
        router.push(ref ? `/register?ref=${ref}` : "/register");
      } else {
        router.push("/dashboard");
      }
      return;
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero / branding section */}
      <div className="flex-1 bg-[#cc0000] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Background texture — subtle diagonal stripes */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "12px 12px",
          }}
        />

        <div className="relative z-10 text-center space-y-4 max-w-sm">
          {/* YES badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-4 py-1.5">
            <span className="text-white font-black text-sm tracking-widest">{L.brand.name}</span>
            <span className="text-white/60 text-xs">·</span>
            <span className="text-white/80 text-xs">{L.brand.subtitle}</span>
          </div>

          {/* Campaign name */}
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none uppercase">
            {L.brand.campaign}
          </h1>

          {/* Slogan */}
          <p className="text-white/75 text-sm sm:text-base italic leading-snug">
            &ldquo;{L.brand.slogan}&rdquo;
          </p>

          {/* Decorative bar */}
          <div className="flex items-center gap-2 justify-center pt-2">
            <div className="h-px w-12 bg-white/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
            <div className="h-px w-12 bg-white/30" />
          </div>

          <p className="text-white/60 text-xs uppercase tracking-widest">
            Աջակիցների պորտալ
          </p>
        </div>
      </div>

      {/* Form section */}
      <div className="bg-background rounded-t-3xl -mt-6 relative z-10 shadow-2xl px-6 pt-8 pb-10">
        <div className="max-w-sm mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              {step === "phone" ? L.auth.login.title : L.auth.login.otpLabel}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "phone"
                ? L.auth.login.subtitlePhone
                : t(L.auth.login.subtitleOtp, { phone })}
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{L.auth.login.phoneLabel}</Label>
                <div className={`flex h-12 rounded-md border overflow-hidden ${phone && !phoneValid ? "border-destructive" : "border-input"}`}>
                  <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-input select-none">
                    +374
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={L.auth.login.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    maxLength={8}
                    required
                    autoFocus
                    className="text-lg h-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {phone && !phoneValid && (
                  <p className="text-xs text-destructive">{L.auth.login.phoneInvalid}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || !phoneValid}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>{L.auth.login.sendCode} <ArrowRight className="h-5 w-5" /></>
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
                  <>{L.auth.login.verify} <ArrowRight className="h-5 w-5" /></>
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
        </div>
      </div>
    </div>
  );
}
