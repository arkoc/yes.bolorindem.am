"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["pending", "approved", "rejected"];
const PAYMENT_OPTIONS = ["pending", "paid"];

const labelMap: Record<string, string> = {
  pending: "Սպ.",
  approved: "✓",
  rejected: "✗",
  paid: "Վճ.",
};

const colorMap: Record<string, string> = {
  pending: "text-muted-foreground",
  approved: "text-green-600",
  rejected: "text-destructive",
  paid: "text-green-600",
};

export function ElectionStatusSelect({
  id,
  field,
  value: initial,
}: {
  id: string;
  field: "status" | "payment_status";
  value: string;
}) {
  const [value, setValue] = useState(initial);
  const options = field === "payment_status" ? PAYMENT_OPTIONS : STATUS_OPTIONS;

  async function onChange(next: string) {
    setValue(next);
    await fetch("/api/admin/elections/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, field, value: next }),
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "text-xs border rounded-md px-2 py-1 bg-background cursor-pointer font-medium",
        colorMap[value]
      )}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{labelMap[opt] ?? opt}</option>
      ))}
    </select>
  );
}
