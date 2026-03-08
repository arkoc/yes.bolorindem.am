"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Loader2, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import L from "@/lib/labels";

interface Props {
  bio: string | null;
  socialUrl: string | null;
  bonusAwarded: boolean;
}

export function EditProfileForm({ bio, socialUrl, bonusAwarded }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [urlValue, setUrlValue] = useState(socialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState(false);

  function handleCancel() {
    setBioValue(bio ?? "");
    setUrlValue(socialUrl ?? "");
    setUrlError(false);
    setEditing(false);
  }

  function validateUrl(value: string): boolean {
    if (!value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  async function handleSave() {
    if (!validateUrl(urlValue)) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioValue, social_url: urlValue }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(data.bonus_awarded
        ? L.volunteer.profile.profileBonusSaved
        : L.volunteer.profile.profileSaved
      );
      setEditing(false);
      router.refresh();
    } catch {
      toast.error(L.volunteer.profile.profileSaveError);
    }
    setLoading(false);
  }

  // ── Display mode ──────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="mt-4 pt-4 border-t space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            {bio ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground/40 italic">
                {L.volunteer.profile.bioPlaceholder}
              </p>
            )}
            {socialUrl && (
              <Link
                href={socialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[200px]">
                  {socialUrl.replace(/^https?:\/\//, "")}
                </span>
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={L.volunteer.profile.editProfile}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {!bonusAwarded && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2.5 py-1.5">
            <Zap className="h-3 w-3 shrink-0" />
            {L.volunteer.profile.profileBonusHint}
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      {!bonusAwarded && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2.5 py-1.5">
          <Zap className="h-3 w-3 shrink-0" />
          {L.volunteer.profile.profileBonusHint}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {L.volunteer.profile.bio}
        </label>
        <Textarea
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value.slice(0, 150))}
          placeholder={L.volunteer.profile.bioPlaceholder}
          className="text-sm resize-none"
          rows={2}
          disabled={loading}
          maxLength={150}
        />
        <p className={`text-xs text-right tabular-nums ${bioValue.length >= 130 ? "text-destructive" : "text-muted-foreground"}`}>
          {bioValue.length}/150
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          {L.volunteer.profile.socialUrl}
        </label>
        <Input
          value={urlValue}
          onChange={(e) => {
            setUrlValue(e.target.value);
            setUrlError(false);
          }}
          placeholder={L.volunteer.profile.socialUrlPlaceholder}
          className="text-sm"
          disabled={loading}
          type="url"
        />
        {urlError ? (
          <p className="text-xs text-destructive">{L.volunteer.profile.socialUrlInvalid}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{L.volunteer.profile.socialUrlHint}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="icon"
          className="h-8 w-8"
          onClick={handleSave}
          disabled={loading}
          aria-label="Save"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Check className="h-4 w-4" />
          }
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleCancel}
          disabled={loading}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
