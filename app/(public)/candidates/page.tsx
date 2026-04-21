import { createAdminClient } from "@/lib/supabase/server";
import L from "@/lib/labels";
import ExportCandidatesPdfButton from "@/components/elections/ExportCandidatesPdfButton";

export const dynamic = "force-dynamic";

import { ExternalLink } from "lucide-react";

type Candidate = {
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
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors">
                {/* Number */}
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {c.candidate_number}
                </div>
                {/* Avatar */}
                <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt={c.full_name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {c.full_name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base">{c.full_name}</p>
                </div>
                {/* Social link */}
                {c.social_url && (
                  <a
                    href={c.social_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-primary hover:text-primary/70 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
