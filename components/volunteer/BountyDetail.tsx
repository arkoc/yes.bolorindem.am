"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, Coins, User, Clock, ImageIcon,
  AlertCircle, X, XCircle, Upload, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import L, { t } from "@/lib/labels";

type BountyStatus = "open" | "closed" | "cancelled";
type CompletionStatus = "pending_review" | "accepted" | "disputed" | "rejected";

interface BountyCompletion {
  id: string;
  user_id: string;
  proof_url: string;
  status: CompletionStatus;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
  completer: { full_name: string } | null;
}

interface Bounty {
  id: string;
  title: string;
  description: string;
  proof_hint: string | null;
  reward_points: number;
  is_repeatable: boolean;
  max_completions: number | null;
  require_photo: boolean;
  image_urls: string[];
  status: BountyStatus;
  created_at: string;
  expires_at: string | null;
  creator_id: string;
  creator: { full_name: string } | null;
  completions: BountyCompletion[];
}

const BOUNTY_VARIANTS: Record<BountyStatus, "default" | "secondary" | "destructive"> = {
  open: "default",
  closed: "secondary",
  cancelled: "destructive",
};
const BOUNTY_LABELS: Record<BountyStatus, string> = {
  open: L.bounty.statusOpen,
  closed: L.bounty.statusClosed,
  cancelled: L.bounty.statusCancelled,
};
const COMP_VARIANTS: Record<CompletionStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  pending_review: "warning",
  accepted: "success",
  disputed: "destructive",
  rejected: "secondary",
};
const COMP_LABELS: Record<CompletionStatus, string> = {
  pending_review: L.bounty.statusPendingReview,
  accepted: L.bounty.statusAccepted,
  disputed: L.bounty.statusDisputed,
  rejected: L.bounty.statusRejected,
};

export function BountyDetail({ bounty, currentUserId }: { bounty: Bounty; currentUserId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [confirmingDispute, setConfirmingDispute] = useState<string | null>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isCreator = currentUserId === bounty.creator_id;
  const myCompletion = bounty.completions.find(c => c.user_id === currentUserId);
  const acceptedCount = bounty.completions.filter(c => c.status === "accepted").length;

  // Can user submit a new completion?
  const canComplete = !isCreator
    && bounty.status === "open"
    && !myCompletion
    && (bounty.is_repeatable || bounty.completions.filter(c => c.status === "accepted").length === 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  }

  async function handleSubmitProof() {
    if (bounty.require_photo && !proofFile) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (proofFile) formData.append("proof", proofFile);
      const res = await fetch(`/api/bounties/${bounty.id}/complete`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error === "expired" ? L.bounty.expiredError : (data.error ?? L.bounty.submitProofFailed));
        return;
      }
      toast.success(t(L.bounty.submitProofSuccess, { points: data.points ?? bounty.reward_points }));
      router.refresh();
    } catch { toast.error(L.bounty.submitProofFailed); }
    finally { setSubmitting(false); }
  }

  async function handleDispute(completionId: string) {
    setActingOn(completionId);
    try {
      const res = await fetch(`/api/bounties/${bounty.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId }),
      });
      if (!res.ok) { toast.error(L.bounty.disputeFailed); return; }
      toast.success(L.bounty.disputeSuccess);
      router.refresh();
    } catch { toast.error(L.bounty.disputeFailed); }
    finally { setActingOn(null); }
  }

  async function handleCancel() {
    if (!confirm(t(L.bounty.cancelConfirm, { points: bounty.reward_points }))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bounties/${bounty.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? L.bounty.cancelFailed); return; }
      toast.success(t(L.bounty.cancelSuccess, { points: data.refunded ?? bounty.reward_points }));
      router.refresh();
    } catch { toast.error(L.bounty.cancelFailed); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ChevronLeft className="h-4 w-4" />
          {L.bounty.backLink}
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold leading-snug">{bounty.title}</h1>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {bounty.is_repeatable && (
              <Badge variant="outline" className="text-xs gap-1">
                <RefreshCw className="h-3 w-3" />
                {acceptedCount}{bounty.max_completions != null ? `/${bounty.max_completions}` : ""}
              </Badge>
            )}
            <Badge variant={BOUNTY_VARIANTS[bounty.status]}>
              {BOUNTY_LABELS[bounty.status]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Cancelled banner */}
      {bounty.status === "cancelled" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{L.bounty.cancelledBanner}</span>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 text-white/80 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightboxIndex < bounty.image_urls.length - 1 && (
            <button
              className="absolute right-3 text-white/80 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          <div className="relative w-full max-w-2xl max-h-[80vh] mx-12" onClick={e => e.stopPropagation()}>
            <Image
              src={bounty.image_urls[lightboxIndex]}
              alt=""
              width={800}
              height={600}
              className="object-contain w-full h-full max-h-[80vh] rounded-lg"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
          {bounty.image_urls.length > 1 && (
            <div className="absolute bottom-4 flex gap-1.5">
              {bounty.image_urls.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === lightboxIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details card */}
      <Card className="overflow-hidden">
        {bounty.image_urls?.length > 0 && (
          <div className={`grid gap-1.5 p-3 pb-0 ${bounty.image_urls.length === 1 ? "grid-cols-1" : bounty.image_urls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {bounty.image_urls.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative aspect-square rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
              >
                <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 672px) 33vw, 224px" />
              </button>
            ))}
          </div>
        )}
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm leading-relaxed">{bounty.description}</p>

          {bounty.proof_hint && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{L.bounty.proofHintTitle}</p>
                <p className="text-sm">{bounty.proof_hint}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              <span>{L.bounty.reward}</span>
            </div>
            <span className="font-semibold text-yellow-600">
              {t(L.bounty.rewardPoints, { points: bounty.reward_points })}
            </span>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{L.bounty.postedBy}</span>
            </div>
            <Link href={`/profile/${bounty.creator_id}`} className="font-medium hover:underline truncate">
              {bounty.creator?.full_name ?? "—"}
            </Link>

            {bounty.expires_at && (
              <>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{L.bounty.expiresAtLabel}</span>
                </div>
                <span>{new Date(bounty.expires_at).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My completion status (non-creator) */}
      {myCompletion && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{L.bounty.mySubmissionTitle}</p>
              <Badge variant={COMP_VARIANTS[myCompletion.status]}>{COMP_LABELS[myCompletion.status]}</Badge>
            </div>
            {myCompletion.status === "accepted" && (
              <p className="text-xs text-green-600">
                {t(myCompletion.resolution === "auto_accepted" ? L.bounty.autoAcceptedBanner : L.bounty.acceptedBanner, { points: bounty.reward_points })}
              </p>
            )}
            {myCompletion.proof_url && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <Image src={myCompletion.proof_url} alt="My proof" fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Anyone: submit proof */}
      {canComplete && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold">{L.bounty.completeTitle}</p>
            <p className="text-xs text-muted-foreground">
              {bounty.require_photo ? L.bounty.uploadProofHint : L.bounty.uploadProofOptionalHint}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {proofPreview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proofPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} type="button">
              <Upload className="h-4 w-4 mr-2" />
              {bounty.require_photo ? L.bounty.uploadBtn : L.bounty.uploadBtnOptional}
            </Button>

            {(!bounty.require_photo || proofFile) && (
              <Button className="w-full" onClick={handleSubmitProof} disabled={submitting}>
                {L.bounty.submitProofBtn}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Creator: empty state when no completions yet */}
      {isCreator && bounty.status === "open" && bounty.completions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">{L.bounty.noCompletionsYet}</p>
      )}

      {/* Creator: completions list */}
      {isCreator && bounty.completions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {L.bounty.completionsHeader}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {bounty.completions.map((c, i) => (
              <div key={c.id}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/profile/${c.user_id}`} className="text-sm font-medium hover:underline">
                      {c.completer?.full_name ?? "—"}
                    </Link>
                    <Badge variant={COMP_VARIANTS[c.status]} className="text-xs shrink-0">
                      {COMP_LABELS[c.status]}
                    </Badge>
                  </div>
                  {c.proof_url && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image src={c.proof_url} alt="Proof" fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" loading="lazy" />
                    </div>
                  )}
                  {c.status === "accepted" && (
                    confirmingDispute === c.id ? (
                      <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                        <p className="text-xs text-destructive text-center">{L.bounty.disputeConfirmPrompt}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => setConfirmingDispute(null)}>
                            {L.bounty.disputeConfirmCancel}
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => { setConfirmingDispute(null); handleDispute(c.id); }} disabled={actingOn === c.id}>
                            {L.bounty.disputeConfirmYes}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full text-destructive" onClick={() => setConfirmingDispute(c.id)} disabled={actingOn === c.id}>
                        <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                        {L.bounty.disputeBtn}
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Creator: cancel */}
      {isCreator && bounty.status === "open" && (
        <Button variant="ghost" className="w-full text-destructive" onClick={handleCancel} disabled={submitting}>
          <XCircle className="h-4 w-4 mr-2" />
          {L.bounty.cancelBtn}
        </Button>
      )}
    </div>
  );
}
