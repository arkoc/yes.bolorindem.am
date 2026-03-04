"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import L from "@/lib/labels";

interface ReferralLinkCopyProps {
  referralCode: string;
}

export function ReferralLinkCopy({ referralCode }: ReferralLinkCopyProps) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${referralCode}`;

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border">
      <span className="flex-1 text-xs font-mono text-muted-foreground truncate">/login?ref={referralCode}</span>
      <Button type="button" size="sm" variant="ghost" className="shrink-0 h-7 px-2" onClick={handleCopy}>
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function CopyReferralButton({ referralCode, label, className }: { referralCode: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const link = `${window.location.origin}/login?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success(L.volunteer.dashboard.referralLinkCopied);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" className={`text-xs h-8 gap-1.5 ${className ?? ""}`} onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
