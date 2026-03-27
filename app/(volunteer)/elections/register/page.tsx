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
    .select("type, payment_status, full_name, patronymic, document_number_hash, passport_number, phone")
    .eq("user_id", user.id)
    .neq("status", "rejected")
    .limit(1)
    .maybeSingle();
  // Allow resuming if this exact type is pending; block otherwise
  if (existing && !(existing.type === type && existing.payment_status === "pending")) redirect("/elections");
  const resumePayment = !!(existing?.type === type && existing?.payment_status === "pending");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <ElectionsRegisterClient
      type={type}
      defaultFullName={existing?.full_name ?? profile?.full_name ?? ""}
      defaultPhone={existing?.phone ?? profile?.phone ?? ""}
      defaultPatronymic={existing?.patronymic ?? ""}
      defaultPassportNumber={existing?.passport_number ?? ""}
      resumePayment={resumePayment}
    />
  );
}
