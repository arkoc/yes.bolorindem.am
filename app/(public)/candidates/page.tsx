import { createAdminClient } from "@/lib/supabase/server";
import L from "@/lib/labels";
import ExportCandidatesPdfButton from "@/components/elections/ExportCandidatesPdfButton";
import CandidatesList from "@/components/elections/CandidatesList";

export const dynamic = "force-dynamic";

export type Candidate = {
  id: string;
  candidate_number: number;
  full_name: string;
  social_url: string | null;
  bio: string | null;
  reason: string | null;
  image_url: string | null;
};

export default async function CandidatesPage() {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("party_candidates")
    .select("id, candidate_number, full_name, social_url, bio, reason, image_url")
    .order("candidate_number", { ascending: true });

  const candidates = (data ?? []) as Candidate[];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-red-800 text-white px-6 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-200 mb-1">
            {L.brand.campaign}
          </p>
          <h1 className="text-2xl font-bold leading-tight mb-2">ԱԺ թեկնածուների ցուցակ</h1>
          <p className="text-red-100 text-sm">{candidates.length} թեկնածուներ</p>
          <div className="mt-3">
            <ExportCandidatesPdfButton />
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Տվյալները հասանելի կլինեն շուտով
          </div>
        ) : (
          <CandidatesList candidates={candidates} />
        )}

      </div>
    </div>
  );
}
