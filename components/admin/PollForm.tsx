"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2, Send, Save } from "lucide-react";
import { toast } from "sonner";
import L from "@/lib/labels";

export function PollForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [pointsPerVote, setPointsPerVote] = useState(0);
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Format as "YYYY-MM-DDTHH:MM" for datetime-local input
    return d.toISOString().slice(0, 16);
  });
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState<"draft" | "publish" | null>(null);

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, value: string) {
    const next = [...options];
    next[i] = value;
    setOptions(next);
  }

  async function handleSubmit(publish: boolean) {
    if (!title.trim()) { toast.error("Title required"); return; }
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) { toast.error("At least 2 options required"); return; }

    setLoading(publish ? "publish" : "draft");
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          allow_multiple: allowMultiple,
          points_per_vote: pointsPerVote,
          expires_at: expiresAt || null,
          notify_on_publish: notifyOnPublish,
          options: validOptions,
          publish,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(publish ? L.admin.voting.pollPublished : L.admin.voting.pollCreated);
      router.push(`/admin/voting/${data.id}`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "Error");
    }
    setLoading(null);
  }

  return (
    <div className="space-y-5">
      {/* Question */}
      <div className="space-y-1.5">
        <Label htmlFor="title">{L.admin.voting.titleLabel} *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={L.admin.voting.titlePlaceholder}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="desc">{L.admin.voting.descriptionLabel}</Label>
        <Textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={L.admin.voting.descriptionPlaceholder}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label>{L.admin.voting.optionsLabel} *</Label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`${L.admin.voting.optionPlaceholder.replace("{n}", String(i + 1))}`}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {L.admin.voting.addOption}
        </Button>
      </div>

      {/* Settings */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Multi-select toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{L.admin.voting.allowMultiple}</p>
              <p className="text-xs text-muted-foreground">Allow selecting more than one option</p>
            </div>
            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
          </div>

          {/* Points per vote */}
          <div className="space-y-1.5">
            <Label htmlFor="points">{L.admin.voting.pointsPerVoteLabel}</Label>
            <Input
              id="points"
              type="number"
              inputMode="numeric"
              min={0}
              value={pointsPerVote}
              onChange={(e) => setPointsPerVote(Math.max(0, parseInt(e.target.value) || 0))}
              className="text-sm w-32"
            />
            <p className="text-xs text-muted-foreground">{L.admin.voting.pointsPerVoteHint}</p>
          </div>

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label htmlFor="expiry">{L.admin.voting.expiryLabel}</Label>
            <Input
              id="expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Notify on publish */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{L.admin.voting.notifyLabel}</p>
            </div>
            <Switch checked={notifyOnPublish} onCheckedChange={setNotifyOnPublish} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          onClick={() => handleSubmit(true)}
          disabled={loading !== null}
        >
          {loading === "publish"
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Send className="h-4 w-4 mr-2" />
          }
          {L.admin.voting.publish}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={loading !== null}
        >
          {loading === "draft"
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Save className="h-4 w-4 mr-2" />
          }
          {L.admin.voting.draft}
        </Button>
      </div>
    </div>
  );
}
