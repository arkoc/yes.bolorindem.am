"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ChevronLeft, Coins, ImageIcon, Loader2, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import L, { t } from "@/lib/labels";

interface BountyCreateFormProps {
  creatorBalance: number;
}

export function BountyCreateForm({ creatorBalance }: BountyCreateFormProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [proofHint, setProofHint] = useState("");
  const [rewardPoints, setRewardPoints] = useState(50);
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [maxCompletions, setMaxCompletions] = useState(2);
  const [expiresAt, setExpiresAt] = useState("");
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const escrow = rewardPoints * (isRepeatable ? maxCompletions : 1);
  const insufficient = escrow > creatorBalance;

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newFiles = [...imageFiles, ...files].slice(0, 5); // max 5 images
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleRemoveImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (insufficient) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("proofHint", proofHint);
      formData.append("rewardPoints", String(rewardPoints));
      formData.append("isRepeatable", String(isRepeatable));
      formData.append("maxCompletions", isRepeatable ? String(maxCompletions) : "");
      formData.append("expiresAt", expiresAt);
      formData.append("requirePhoto", String(requirePhoto));
      imageFiles.forEach(f => formData.append("images", f));
      const res = await fetch("/api/bounties", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error === "insufficient_points" ? L.bounty.insufficientPoints : (data.error ?? L.bounty.createFailed));
        return;
      }
      toast.success(L.bounty.createSuccess);
      router.push(`/bounties/${data.id}`);
    } catch {
      toast.error(L.bounty.createFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {L.bounty.backLink}
        </Link>
        <h1 className="text-2xl font-bold">{L.bounty.createTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{L.bounty.createSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              {L.bounty.createTitle}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRepeatable
                ? t(L.bounty.balanceHintRepeatable, { balance: creatorBalance, reward: rewardPoints, count: maxCompletions })
                : t(L.bounty.balanceHint, { balance: creatorBalance, reward: rewardPoints })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">{L.bounty.titleLabel}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => { setTitle(v => v.trim()); setTitleTouched(true); }}
                placeholder={L.bounty.titlePlaceholder}
                maxLength={120}
              />
              {titleTouched && !title.trim() && (
                <p className="text-xs text-destructive">{L.bounty.titleRequired}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">{L.bounty.descriptionLabel}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setDescriptionTouched(true)}
                placeholder={L.bounty.descriptionPlaceholder}
                rows={4}
                maxLength={1000}
              />
              {descriptionTouched && !description.trim() && (
                <p className="text-xs text-destructive">{L.bounty.descriptionRequired}</p>
              )}
            </div>

            {/* Images */}
            <div className="space-y-1.5">
              <Label>{L.bounty.coverImageLabel}</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagesChange}
              />
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-background"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 5 && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-xs">+</span>
                    </button>
                  )}
                </div>
              )}
              {imagePreviews.length === 0 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-xs">{L.bounty.coverImageHint}</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proofHint">{L.bounty.proofHintLabel}</Label>
              <Input
                id="proofHint"
                value={proofHint}
                onChange={(e) => setProofHint(e.target.value)}
                placeholder={L.bounty.proofHintPlaceholder}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reward">{L.bounty.rewardLabel}</Label>
              <Input
                id="reward"
                type="number"
                value={rewardPoints}
                onChange={(e) => setRewardPoints(Number(e.target.value))}
                min={10}
                required
              />
              {rewardPoints < 10 && (
                <p className="text-xs text-destructive">{L.bounty.rewardMin}</p>
              )}
            </div>

            {/* Require photo toggle */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <input
                id="requirePhoto"
                type="checkbox"
                checked={requirePhoto}
                onChange={(e) => setRequirePhoto(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="requirePhoto" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  {L.bounty.requirePhotoLabel}
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">{L.bounty.requirePhotoHint}</p>
              </div>
            </div>

            {/* Repeatable toggle */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <input
                id="repeatable"
                type="checkbox"
                checked={isRepeatable}
                onChange={(e) => setIsRepeatable(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="repeatable" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-primary" />
                  {L.bounty.repeatableLabel}
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">{L.bounty.repeatableHint}</p>
              </div>
            </div>

            {/* Max completions — only shown when repeatable */}
            {isRepeatable && (
              <div className="space-y-1.5">
                <Label htmlFor="maxCompletions">{L.bounty.maxCompletionsLabel}</Label>
                <Input
                  id="maxCompletions"
                  type="number"
                  value={maxCompletions}
                  onChange={(e) => setMaxCompletions(Math.max(2, Number(e.target.value)))}
                  min={2}
                  required
                />
                {maxCompletions < 2 && (
                  <p className="text-xs text-destructive">{L.bounty.maxCompletionsMin}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="expires">{L.bounty.expiresLabel}</Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {insufficient && (
              <p className="text-xs text-destructive">{L.bounty.insufficientPoints}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || insufficient || !title.trim() || !description.trim() || rewardPoints < 10 || (isRepeatable && maxCompletions < 2)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {L.bounty.creating}
                </>
              ) : t(L.bounty.submitBtn, { points: escrow })}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
