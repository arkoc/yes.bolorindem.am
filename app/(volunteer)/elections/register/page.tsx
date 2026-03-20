import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ElectionsRegisterClient } from "@/components/elections/ElectionsRegisterClient";

export default async function ElectionsRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (type !== "voter" && type !== "candidate") redirect("/elections");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Block if already registered as this type or as the other type
  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from("election_registrations")
    .select("type")
    .eq("user_id", user.id)
    .neq("status", "rejected")
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/elections");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <ElectionsRegisterClient
      type={type}
      defaultFullName={profile?.full_name ?? ""}
      defaultPhone={profile?.phone ?? ""}
    />
  );
}
