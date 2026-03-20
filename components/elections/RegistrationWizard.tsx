"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import L from "@/lib/labels";
import { formatAMD, VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";

type RegistrationType = "voter" | "candidate";

interface FormData {
  full_name: string;
  document_number: string;
  phone: string;
  acceptance_movement: boolean;
  acceptance_citizenship: boolean;
  acceptance_self_restriction: boolean;
  acceptance_age_25: boolean;
  acceptance_only_armenian: boolean;
  acceptance_lived_in_armenia: boolean;
  acceptance_armenian_school: boolean;
}


function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all",
        checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
      )}
    >
      <div className={cn(
        "mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
        checked ? "border-primary bg-primary" : "border-muted-foreground/40"
      )}>
        {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
      </div>
      <span className="text-sm font-medium leading-relaxed">{children}</span>
    </button>
  );
}

export function RegistrationWizard({
  type,
  defaultFullName = "",
  defaultPhone = "",
}: {
  type: RegistrationType;
  defaultFullName?: string;
  defaultPhone?: string;
}) {
  const isCandidate = type === "candidate";
  const fee = isCandidate ? CANDIDATE_FEE : VOTER_FEE;

  // Steps: 0=overview, 1=identity, 2=movement, 3=citizenship,
  // candidate adds 4=self-restriction, 5=age25, 6=only-armenian, 7=lived, 8=school
  // last step = payment
  const totalSteps = isCandidate ? 9 : 4;
  const paymentStep = totalSteps; // step after all inputs

  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    full_name: defaultFullName, document_number: "", phone: defaultPhone,
    acceptance_movement: false, acceptance_citizenship: false,
    acceptance_self_restriction: false, acceptance_age_25: false,
    acceptance_only_armenian: false, acceptance_lived_in_armenia: false,
    acceptance_armenian_school: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  function canProceed() {
    if (step === 1) return form.full_name.trim().length >= 2 && form.document_number.trim().length >= 4 && form.phone.trim().length >= 5;
    if (step === 2) return form.acceptance_movement;
    if (step === 3) return form.acceptance_citizenship;
    if (step === 4) return form.acceptance_self_restriction;
    if (step === 5) return form.acceptance_age_25;
    if (step === 6) return form.acceptance_only_armenian;
    if (step === 7) return form.acceptance_lived_in_armenia;
    if (step === 8) return form.acceptance_armenian_school;
    return true;
  }

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/elections/init-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...form }),
      });
      const json = await res.json();
      if (res.status === 409) { setError(L.elections.duplicateError); return; }
      if (!res.ok) { setError(json.error ?? L.elections.genericError); return; }
      // Redirect to AmeriBank payment page — loading stays true intentionally
      window.location.href = json.paymentUrl;
    } catch {
      setError(L.elections.genericError);
      setLoading(false);
    }
  }

  // Payment / submit step
  const isPaymentStep = step === paymentStep;

  function stepContent() {
    if (step === 1) return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{L.elections.fullNameLabel}</Label>
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder={L.elections.fullNamePlaceholder}
            className="h-12 text-base"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label>{L.elections.documentLabel}</Label>
          <Input
            value={form.document_number}
            onChange={(e) => set("document_number", e.target.value)}
            placeholder={L.elections.documentPlaceholder}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label>{L.elections.phoneLabel}</Label>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder={L.elections.phonePlaceholder}
            type="tel"
            className="h-12 text-base"
          />
        </div>
      </div>
    );
    if (step === 2) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.movementText}</p>
        <CheckRow checked={form.acceptance_movement} onChange={(v) => set("acceptance_movement", v)}>
          {L.elections.acceptMovement}
        </CheckRow>
      </div>
    );
    if (step === 3) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.citizenshipText}</p>
        <CheckRow checked={form.acceptance_citizenship} onChange={(v) => set("acceptance_citizenship", v)}>
          {L.elections.acceptCitizenship}
        </CheckRow>
      </div>
    );
    if (step === 4) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.selfRestrictionText}</p>
        <CheckRow checked={form.acceptance_self_restriction} onChange={(v) => set("acceptance_self_restriction", v)}>
          {L.elections.acceptSelfRestriction}
        </CheckRow>
      </div>
    );
    if (step === 5) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.age25Text}</p>
        <CheckRow checked={form.acceptance_age_25} onChange={(v) => set("acceptance_age_25", v)}>
          {L.elections.acceptAge25}
        </CheckRow>
      </div>
    );
    if (step === 6) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.onlyArmenianText}</p>
        <CheckRow checked={form.acceptance_only_armenian} onChange={(v) => set("acceptance_only_armenian", v)}>
          {L.elections.acceptOnlyArmenian}
        </CheckRow>
      </div>
    );
    if (step === 7) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.livedInArmeniaText}</p>
        <CheckRow checked={form.acceptance_lived_in_armenia} onChange={(v) => set("acceptance_lived_in_armenia", v)}>
          {L.elections.acceptLivedInArmenia}
        </CheckRow>
      </div>
    );
    if (step === 8) return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.armenianSchoolText}</p>
        <CheckRow checked={form.acceptance_armenian_school} onChange={(v) => set("acceptance_armenian_school", v)}>
          {L.elections.acceptArmenianSchool}
        </CheckRow>
      </div>
    );
    // Payment step
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-primary/5 border-2 border-primary/20 p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">{L.elections.paymentAmountLabel}</p>
          <p className="text-4xl font-bold text-primary">{formatAMD(fee)}</p>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {L.elections.paymentInstructions}
        </p>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    );
  }

  function stepTitle() {
    const titles: Record<number, string> = {
      1: L.elections.stepIdentityTitle,
      2: L.elections.stepMovementTitle,
      3: L.elections.stepCitizenshipTitle,
      4: L.elections.stepSelfRestrictionTitle,
      5: L.elections.stepAge25Title,
      6: L.elections.stepOnlyArmenianTitle,
      7: L.elections.stepLivedInArmeniaTitle,
      8: L.elections.stepArmenianSchoolTitle,
      [paymentStep]: L.elections.stepPaymentTitle,
    };
    return titles[step] ?? "";
  }

  // actual steps (1..totalSteps+1 including payment)
  const displayStep = step;
  const displayTotal = totalSteps + 1;
  const progressPct = ((displayStep - 1) / (displayTotal - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 bg-background border-b z-10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => step === 1 ? router.push("/elections") : setStep((s) => s - 1)}
          className="p-2 -ml-1 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <Progress value={progressPct} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {displayStep - 1} / {displayTotal - 1}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-8 pb-6 max-w-lg mx-auto w-full flex flex-col gap-8">
        <h2 className="text-xl font-bold">{stepTitle()}</h2>
        <div className="flex-1">{stepContent()}</div>
      </div>

      {/* Bottom button */}
      <div className="sticky bottom-0 bg-background border-t px-5 py-4">
        <Button
          className="w-full h-12 text-base"
          disabled={!canProceed() || loading}
          onClick={() => {
            if (isPaymentStep) {
              submit();
            } else {
              setStep((s) => s + 1);
            }
          }}
        >
          {loading ? "..." : isPaymentStep ? L.elections.submitBtn : L.elections.nextBtn}
        </Button>
      </div>
    </div>
  );
}
