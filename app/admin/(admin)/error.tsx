"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Սխալ է տեղի ունեցել</h1>
        <p className="text-sm text-muted-foreground">Խնդրում ենք փորձել կրկին</p>
        <Button onClick={reset} className="w-full">Կրկին փորձել</Button>
        <Button variant="outline" className="w-full" onClick={() => window.location.href = "/admin/dashboard"}>
          Admin Dashboard
        </Button>
      </div>
    </div>
  );
}
