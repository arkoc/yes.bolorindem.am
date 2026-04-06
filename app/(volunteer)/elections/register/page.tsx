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

  const { createAdminClient } = await import("@/lib/supabase/server");
  const adminClient = createAdminClient();
  const { data: allRegs } = await adminClient
    .from("election_registrations")
    .select("type, payment_status, status, full_name, patronymic, document_number, passport_number, phone")
    .eq("user_id", user.id)
    .neq("status", "rejected");

  const regs = allRegs ?? [];
  const sameTypeReg = regs.find((r) => r.type === type);
  const voterReg = regs.find((r) => r.type === "voter");

  const isVoterUpgrade = type === "candidate" && !!voterReg && !sameTypeReg;
  const isResume = !!sameTypeReg && sameTypeReg.payment_status === "pending";
  const isApproved = !!sameTypeReg && sameTypeReg.payment_status === "paid";

  // Block: already approved for this type, or has unrelated paid registration
  if (isApproved) redirect("/elections");
  if (!isResume && !isVoterUpgrade && regs.length > 0 && !sameTypeReg) redirect("/elections");

  const resumePayment = isResume;
  const prefill = sameTypeReg ?? voterReg;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <ElectionsRegisterClient
      type={type}
      defaultFullName={prefill?.full_name ?? profile?.full_name ?? ""}
      defaultPhone={prefill?.phone ?? profile?.phone ?? ""}
      defaultPatronymic={prefill?.patronymic ?? ""}
      defaultPassportNumber={prefill?.passport_number ?? ""}
      defaultDocumentNumber={prefill?.document_number ?? ""}
      resumePayment={resumePayment}
    />
  );
}
