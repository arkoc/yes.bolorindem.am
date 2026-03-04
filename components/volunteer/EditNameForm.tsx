"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import L from "@/lib/labels";

export function EditNameForm({ name }: { name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [loading, setLoading] = useState(false);

  function handleCancel() {
    setValue(name);
    setEditing(false);
  }

  async function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast.success(L.volunteer.profile.nameUpdated);
      setEditing(false);
      router.refresh();
    } catch {
      toast.error(L.volunteer.profile.nameUpdateError);
    }
    setLoading(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{name}</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit name"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-base font-semibold"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        disabled={loading}
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSave} disabled={loading || value.trim().length < 2}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCancel} disabled={loading}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
