import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { VOTER_GOAL, CANDIDATE_GOAL, formatAMD, VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";
import L from "@/lib/labels";

export const revalidate = 60;

export default async function ElectionsPage() {
  const supabase = createAdminClient();
  const authClient = await createServerClient();

  const [{ data: counts }, { data: { user } }] = await Promise.all([
    supabase.from("election_counts").select("*").single(),
    authClient.auth.getUser(),
  ]);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin" || profile?.role === "leader";
  }

  const voterCount = Number(counts?.voter_count ?? 0);
  const candidateCount = Number(counts?.candidate_count ?? 0);
  const voterPct = Math.min(100, (voterCount / VOTER_GOAL) * 100);
  const candidatePct = Math.min(100, (candidateCount / CANDIDATE_GOAL) * 100);

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-red-800 text-white px-6 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-200 mb-1">
          {L.brand.campaign}
        </p>
        <h1 className="text-2xl font-bold leading-tight mb-2">{L.elections.heroTitle}</h1>
        <p className="text-red-100 text-sm leading-relaxed">{L.elections.heroSubtitle}</p>
      </div>

      {/* Document link */}
      <div className="rounded-2xl border px-5 py-4 text-sm leading-relaxed">
        <p>
          ԱԺ ցուցակի կազման ընթացակարգին ծանոթացեք{" "}
          <a
            href="https://docs.google.com/document/d/1FkCTAsTkgIBPO_mGgMVTG0rr7TBLSKa_wtdADrOkvqI"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
          >
            հետևյալ հղումով <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      {/* Progress counters */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{L.elections.goalVoterLabel}</span>
            <span className="text-muted-foreground tabular-nums">
              {voterCount.toLocaleString()} / {VOTER_GOAL.toLocaleString()}
            </span>
          </div>
          <Progress value={voterPct} className="h-3" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{L.elections.goalCandidateLabel}</span>
            <span className="text-muted-foreground tabular-nums">
              {candidateCount} / {CANDIDATE_GOAL}
            </span>
          </div>
          <Progress value={candidatePct} className="h-3" />
        </div>
      </div>

      {/* CTA cards */}
      <div className={`space-y-3${isAdmin ? "" : " opacity-40 pointer-events-none select-none"}`}>
        <Link href="/elections/register?type=voter" className="block rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base">{L.elections.registerVoter}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{L.elections.voterFeeLabel}: {formatAMD(VOTER_FEE)}</p>
            </div>
            <span className="text-2xl">🗳</span>
          </div>
        </Link>

        <Link href="/elections/register?type=candidate" className="block rounded-2xl border-2 border-amber-500/20 bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-base">{L.elections.registerCandidate}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{L.elections.candidateFeeLabel}: {formatAMD(CANDIDATE_FEE)}</p>
            </div>
            <span className="text-2xl">🏛</span>
          </div>
        </Link>
      </div>

      {!isAdmin && (
        <div className="rounded-2xl bg-muted border text-center px-5 py-4">
          <p className="text-sm font-semibold">Գրանցումները կբացվեն Մարտի վերջում</p>
        </div>
      )}
    </div>
  );
}
