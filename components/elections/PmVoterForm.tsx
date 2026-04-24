"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PmVoterFormProps {
  currentEmail: string | null;
  isDeadlinePassed: boolean;
  isLoggedIn: boolean;
}

export default function PmVoterForm({
  currentEmail,
  isDeadlinePassed,
  isLoggedIn,
}: PmVoterFormProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Էլ. հասցեն պետք է լինի");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/pm/voter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "deadline_passed") {
          toast.error("Ժամանակահատվածը ավարտվել է");
        } else {
          toast.error(data.error || "Չհաջողվեց գրանցել");
        }
        return;
      }

      toast.success("Գրանցվել եք հաջողությամբ");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error submitting voter registration:", error);
      toast.error("Տեղի է ունեցել սխալ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Կուզե՞ք հեռացնել ձեր գրանցումը")) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/pm/voter", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "deadline_passed") {
          toast.error("Ժամանակահատվածը ավարտվել է");
        } else {
          toast.error("Չհաջողվեց հեռացնել գրանցումը");
        }
        return;
      }

      toast.success("Գրանցումը հեռացվել է");
      setEmail("");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting voter registration:", error);
      toast.error("Սխալ պահարար");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Հայտնվեք ներսում՝ գրանցվելու համար
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
          Գրանցման ժամանակահատվածը ավարտվել է
        </p>
      </div>
    );
  }

  if (currentEmail && !isEditing) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-2">Ձեր էլ. հասցե</p>
        <p className="text-base font-semibold mb-4">{currentEmail}</p>
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
        <Label htmlFor="voter-email">Ձեր էլ. հասցե</Label>
        <Input
          id="voter-email"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1">Կօգտագործվի առցանց քվեարկության համար</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Պահվում է..." : "Գրանցվել"}
        </Button>
        {currentEmail && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => {
              setIsEditing(false);
              setEmail(currentEmail);
            }}
          >
            Չեղարկել
          </Button>
        )}
      </div>
    </form>
  );
}
