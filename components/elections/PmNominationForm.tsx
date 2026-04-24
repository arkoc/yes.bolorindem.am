"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PmNominationFormProps {
  currentNomination: string | null;
  currentEmail: string | null;
  isDeadlinePassed: boolean;
  isLoggedIn: boolean;
}

export default function PmNominationForm({
  currentNomination,
  currentEmail,
  isDeadlinePassed,
  isLoggedIn,
}: PmNominationFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [nomineeName, setNomineeName] = useState(currentNomination || "");
  const [email, setEmail] = useState(currentEmail || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = nomineeName.trim();
    const words = trimmedName.split(/\s+/).filter(Boolean);

    if (words.length < 2) {
      toast.error("Անունը պետք է պարունակի առաջին և ազգանուն");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/pm/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nominee_name: trimmedName,
          email: email.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "deadline_passed") {
          toast.error("Ժամանակահատվածը ավարտվել է");
        } else {
          toast.error(data.error || "Չհաջողվեց պահել թեկնածուն");
        }
        return;
      }

      toast.success("Թեկնածուն առաջադրվել է հաջողությամբ");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error submitting nomination:", error);
      toast.error("Տեղի է ունեցել սխալ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Կուզե՞ք հեռացնել ձեր առաջադրումը")) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/pm/nominate", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "deadline_passed") {
          toast.error("Ժամանակահատվածը ավարտվել է");
        } else {
          toast.error("Չհաջողվեց հեռացնել թեկնածուն");
        }
        return;
      }

      toast.success("Առաջադրումը հեռացվել է");
      setNomineeName("");
      setEmail("");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting nomination:", error);
      toast.error("Սխալ պահարար");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Հայտնվեք ներսում՝ վարչապետի թեկնածուն առաջադրելու համար
        </p>
        <Button asChild>
          <a href="/login?next=/pm">Հայտնվել</a>
        </Button>
      </div>
    );
  }

  if (isDeadlinePassed) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Առաջադրությունների ժամանակահատվածը ավարտվել է
        </p>
      </div>
    );
  }

  if (currentNomination && !isEditing) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-2">Ձեր առաջադրումը</p>
        <p className="text-base font-semibold mb-4">{currentNomination}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Փոխել
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Հեռացնել
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 space-y-4">
      <div>
        <Label htmlFor="nominee">Վարչապետի թեկնածուի անուն</Label>
        <Input
          id="nominee"
          placeholder="Անուն Ազգանուն"
          value={nomineeName}
          onChange={(e) => setNomineeName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1">Խնդրում ենք գրել հայերեն</p>
      </div>

      <div>
        <Label htmlFor="email">Ձեր էլ. հասցե</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">Կօգտագործվի առցանց քվեարկության համար</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Պահվում է..." : "Առաջադրել"}
        </Button>
        {currentNomination && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => {
              setIsEditing(false);
              setNomineeName(currentNomination);
              setEmail(currentEmail || "");
            }}
          >
            Չեղարկել
          </Button>
        )}
      </div>
    </form>
  );
}
