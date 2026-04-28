"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import L, { t } from "@/lib/labels";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const RESEND_COOLDOWN = 60;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;

type Step = "input" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("input");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && step === "otp" && !loading) {
      doVerify(otp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 8;
  const normalizedPhone = `+374${phoneDigits}`;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("Հաստատեք, որ մարդ եք");
      return;
    }
    setLoading(true);

    const options = captchaToken ? { captchaToken } : undefined;

    const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone, options });

    if (error) {
      toast.error(error.message);
      // Reset Turnstile so user can retry
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    } else {
      toast.success(L.auth.login.codeSent);
      setStep("otp");
      startCooldown();
    }
    setLoading(false);
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(L.auth.login.codeSent);
      startCooldown();
    }
    setLoading(false);
  }

  async function doVerify(token: string) {
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({ phone: normalizedPhone, token, type: "sms" });

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

      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      const next = params.get("next");
      if (!profile?.full_name || profile.full_name === "New Volunteer") {
        router.push(ref ? `/register?ref=${ref}` : "/register");
      } else {
        router.push(next && next.startsWith("/") ? next : "/dashboard");
      }
      return;
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    await doVerify(otp);
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Hero / branding section */}
      <div className="flex-1 bg-[#cc0000] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "12px 12px",
          }}
        />

        <div className="relative z-10 text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-4 py-1.5">
            <span className="text-white font-black text-sm tracking-widest">{L.brand.name}</span>
            <span className="text-white/60 text-xs">·</span>
            <span className="text-white/80 text-xs">{L.brand.subtitle}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none uppercase">
            {L.brand.campaign}
          </h1>

          <p className="text-white/75 text-sm sm:text-base italic leading-snug">
            &ldquo;{L.brand.slogan}&rdquo;
          </p>

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
              {step === "input" ? L.auth.login.title : L.auth.login.otpLabel}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "input"
                ? L.auth.login.subtitlePhone
                : t(L.auth.login.subtitleOtp, { dest: normalizedPhone })}
            </p>
          </div>

          {step === "input" ? (
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

              {TURNSTILE_SITE_KEY && (
                <div className="flex items-center justify-center rounded-xl overflow-hidden bg-muted/40 py-1">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    options={{ size: "compact", theme: "light", appearance: "interaction-only" }}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || !phoneValid || (!!TURNSTILE_SITE_KEY && !captchaToken)}
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
                  autoComplete="one-time-code"
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
                disabled={loading || resendCooldown > 0}
                onClick={handleResend}
              >
                {resendCooldown > 0
                  ? t(L.auth.login.resendIn, { sec: resendCooldown })
                  : L.auth.login.resendCode}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setStep("input"); setOtp(""); setCaptchaToken(null); turnstileRef.current?.reset(); }}
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
