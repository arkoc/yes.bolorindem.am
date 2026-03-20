"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserRoleSelectProps {
  userId: string;
  currentRole: string;
}

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const router = useRouter();

  async function handleChange(newRole: string) {
    const prev = role;
    setRole(newRole);

    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) {
      toast.error("Failed to update role.");
      setRole(prev);
    } else {
      toast.success(`Role updated to ${newRole}`);
      router.refresh();
    }
  }

  return (
    <Select value={role} onValueChange={handleChange}>
      <SelectTrigger className="w-28 h-9 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="volunteer">Volunteer</SelectItem>
        <SelectItem value="leader">Leader</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
