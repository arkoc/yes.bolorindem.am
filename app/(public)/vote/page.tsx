import { createAdminClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Users, UserCheck } from "lucide-react";
import Link from "next/link";
import {
  VOTER_GOAL, CANDIDATE_GOAL,
  formatAMD, VOTER_FEE, CANDIDATE_FEE,
  VOTER_POINTS, CANDIDATE_POINTS,
} from "@/lib/elections-config";
import L from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PublicVotePage() {
  const adminClient = createAdminClient();

  const [{ data: counts }, { data: candidates }, { data: voters }, pendingVotersRes, pendingCandidatesRes] = await Promise.all([
    adminClient.from("election_counts").select("*").single(),
    adminClient
      .from("election_registrations")
      .select("id, full_name")
      .eq("type", "candidate")
      .eq("payment_status", "paid")
      .neq("status", "rejected")
      .order("full_name", { ascending: true }),
    adminClient
      .from("election_registrations")
      .select("id, full_name")
      .in("type", ["voter", "candidate"])
      .eq("payment_status", "paid")
      .neq("status", "rejected")
      .order("full_name", { ascending: true })
      .limit(200),
    adminClient.from("election_registrations").select("id", { count: "exact", head: true }).eq("type", "voter").eq("payment_status", "pending"),
    adminClient.from("election_registrations").select("id", { count: "exact", head: true }).eq("type", "candidate").eq("payment_status", "pending"),
  ]);

  const voterCount = Number(counts?.voter_count ?? 0);
  const candidateCount = Number(counts?.candidate_count ?? 0);
  const voterPct = Math.min(100, (voterCount / VOTER_GOAL) * 100);
  const candidatePct = Math.min(100, (candidateCount / CANDIDATE_GOAL) * 100);
  const pendingVoters = pendingVotersRes.count ?? 0;
  const pendingCandidates = pendingCandidatesRes.count ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
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

        {/* Progress */}
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

        {/* Pending counts */}
        {(pendingVoters > 0 || pendingCandidates > 0) && (
          <div className="rounded-xl border bg-yellow-50 border-yellow-200 px-4 py-3 text-sm text-yellow-800 space-y-0.5">
            {pendingVoters > 0 && <p>⏳ {pendingVoters} ընտրող սպասում է վճարի հաստատման</p>}
            {pendingCandidates > 0 && <p>⏳ {pendingCandidates} թեկնածու սպասում է վճարի հաստատման</p>}
          </div>
        )}

        {/* Register CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/login?next=/elections/register?type=voter"
            className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 text-center hover:bg-primary/10 transition-colors"
          >
            <span className="text-2xl block mb-1">🗳</span>
            <p className="font-bold text-sm">{L.elections.registerVoter}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatAMD(VOTER_FEE)}</p>
            <p className="text-xs text-yellow-600 font-semibold mt-1">+{VOTER_POINTS.toLocaleString()} միավոր</p>
          </Link>
          <Link
            href="/login?next=/elections/register?type=candidate"
            className="rounded-2xl border-2 border-green-500/20 bg-green-50 p-4 text-center hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl block mb-1">🏛</span>
            <p className="font-bold text-sm">{L.elections.registerCandidate}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatAMD(CANDIDATE_FEE)}</p>
            <p className="text-xs text-yellow-600 font-semibold mt-1">+{CANDIDATE_POINTS.toLocaleString()} միավոր</p>
          </Link>
        </div>

        {/* Candidates list */}
        {(candidates ?? []).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">{L.elections.candidatesTitle} ({candidateCount})</h2>
            </div>
            <div className="rounded-xl border divide-y">
              {(candidates ?? []).map((c) => (
                <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {c.full_name.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{c.full_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voters list */}
        {(voters ?? []).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">{L.elections.votersTitle} ({voterCount})</h2>
            </div>
            <div className="rounded-xl border divide-y">
              {(voters ?? []).map((v) => (
                <div key={v.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">
                      {v.full_name.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm">{v.full_name}</span>
                </div>
              ))}
            </div>
            {voterCount > 200 && (
              <p className="text-xs text-muted-foreground text-center">
                {L.elections.showingFirst} 200
              </p>
            )}
          </div>
        )}

        {/* Footer link back to app */}
        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-muted-foreground underline underline-offset-2">
            Մուտք գործել հարթակ
          </Link>
        </div>

      </div>
    </div>
  );
}
