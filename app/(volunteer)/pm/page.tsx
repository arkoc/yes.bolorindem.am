import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { PM_NOMINATION_DEADLINE } from "@/lib/elections-config";
import PmPageClient from "@/components/elections/PmPageClient";

export const dynamic = "force-dynamic";

export default async function PmPage() {
  const adminClient = createAdminClient();
  const supabase = await createServerClient();

  // Get nominee counts
  const { data: nominees = [] } = await adminClient
    .from("pm_nominee_counts")
    .select("nominee_name, nomination_count")
    .order("nomination_count", { ascending: false });

  // Get current user and their nomination/voter registration
  const { data: { user } } = await supabase.auth.getUser();
  let currentNomination: string | null = null;
  let currentVoterEmail: string | null = null;

  if (user) {
    // Check nomination
    const { data: nom } = await supabase
      .from("pm_nominations")
      .select("nominee_name")
      .eq("user_id", user.id)
      .single();

    if (nom) {
      currentNomination = nom.nominee_name;
    }

    // Check voter registration
    const { data: voter } = await supabase
      .from("pm_voters")
      .select("email")
      .eq("user_id", user.id)
      .single();

    if (voter) {
      currentVoterEmail = voter.email;
    }
  }

  const isDeadlinePassed = new Date() >= PM_NOMINATION_DEADLINE;

  const deadlineFormatted = PM_NOMINATION_DEADLINE.toLocaleDateString("hy-AM", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
      <PmPageClient
        nominees={nominees || []}
        currentNomination={currentNomination}
        currentVoterEmail={currentVoterEmail}
        isDeadlinePassed={isDeadlinePassed}
        user={user}
        deadlineFormatted={deadlineFormatted}
      />
    </div>
  );
}
