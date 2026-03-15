import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { BountyCreateForm } from "@/components/volunteer/BountyCreateForm";

export const dynamic = "force-dynamic";

export default async function BountyCreatePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("total_points")
    .eq("id", user.id)
    .single();

  return (
    <BountyCreateForm creatorBalance={profile?.total_points ?? 0} />
  );
}
