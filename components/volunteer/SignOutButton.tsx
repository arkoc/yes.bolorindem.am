"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import L from "@/lib/labels";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success(L.volunteer.nav.signedOut);
    router.push("/login");
  }

  return (
    <Button
      variant="ghost"
      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" />
      {L.volunteer.nav.signOut}
    </Button>
  );
}
