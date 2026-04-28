"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface BanUserButtonProps {
  userId: string;
  userName: string;
  isBanned: boolean;
}

export function BanUserButton({ userId, userName, isBanned }: BanUserButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleBan = async () => {
    let reason: string | null = null;

    if (isBanned) {
      if (!confirm(`Ապաբաժանե՞լ ${userName}-ին`)) return;
    } else {
      reason = prompt(`Ինչու ենք բաժանում ${userName}-ին?`);
      if (!reason) return;
    }

    setIsLoading(true);
    try {
      const method = isBanned ? "DELETE" : "POST";
      const res = await fetch(`/api/admin/pm/ban/${userId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ reason }) : undefined,
      });

      if (!res.ok) throw new Error("Failed");

      const action = isBanned ? "ապաբաժանված է" : "բաժանված է";
      toast.success(`${userName}-ը ${action}`);
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Չհաջողվեց բաժանել/ապաբաժանել");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={isBanned ? "outline" : "destructive"}
      onClick={handleToggleBan}
      disabled={isLoading}
      className={isBanned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : ""}
    >
      {isBanned ? (
        <>
          <RotateCcw className="h-4 w-4 mr-2" />
          Ապաբաժանել
        </>
      ) : (
        <>
          <Ban className="h-4 w-4 mr-2" />
          Բաժանել
        </>
      )}
    </Button>
  );
}
