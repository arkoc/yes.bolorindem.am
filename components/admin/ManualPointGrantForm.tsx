"use client";

import L, { t } from "@/lib/labels";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VolunteerSearch } from "./VolunteerSearch";
import { Loader2 } from "lucide-react";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.coerce.number().refine((n) => n !== 0, L.forms.manualGrant.amountZeroError),
  description: z.string().min(1, L.forms.manualGrant.reasonRequired),
});

type FormValues = z.infer<typeof schema>;

interface User {
  id: string;
  full_name: string;
  total_points: number;
}

export function ManualPointGrantForm({ users }: { users: User[] }) {
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const router = useRouter();

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/points/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || L.forms.manualGrant.toastFailed);
        return;
      }

      toast.success(t(L.forms.manualGrant.toastSuccess, { amount: `${data.amount > 0 ? "+" : ""}${data.amount}` }));
      reset();
      setSelectedUserId("");
      router.refresh();
    } catch {
      toast.error(L.forms.manualGrant.toastFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{L.forms.manualGrant.volunteerLabel}</Label>
        <VolunteerSearch
          users={users}
          value={selectedUserId}
          onChange={(id) => {
            setSelectedUserId(id);
            setValue("userId", id);
          }}
          placeholder={L.forms.manualGrant.volunteerPlaceholder}
          renderSuffix={(u) => `${u.total_points} pts`}
        />
        {errors.userId && <p className="text-xs text-destructive">{L.forms.manualGrant.volunteerRequired}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">
          {L.forms.manualGrant.amountLabel}
          <span className="text-muted-foreground text-xs font-normal ml-1">{L.forms.manualGrant.amountHint}</span>
        </Label>
        <Input
          id="amount"
          type="number"
          {...register("amount")}
          placeholder={L.forms.manualGrant.amountPlaceholder}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">{L.forms.manualGrant.reasonLabel}</Label>
        <Input
          id="description"
          {...register("description")}
          placeholder={L.forms.manualGrant.reasonPlaceholder}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : L.forms.manualGrant.submit}
      </Button>
    </form>
  );
}
