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
