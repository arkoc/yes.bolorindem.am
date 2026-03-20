import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { VOTER_GOAL, CANDIDATE_GOAL, formatAMD, VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";
import L from "@/lib/labels";
import { CancelRegistrationButton } from "@/components/elections/CancelRegistrationButton";

export const dynamic = "force-dynamic";

export default async function ElectionsPage() {
  const adminClient = createAdminClient();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: counts }, { data: candidates }, { data: myRegs }] = await Promise.all([
    adminClient.from("election_counts").select("*").single(),
    adminClient
      .from("election_registrations")
      .select("id, full_name, created_at")
      .eq("type", "candidate")
      .eq("payment_status", "paid")
      .neq("status", "rejected")
      .order("created_at", { ascending: true }),
    user
      ? adminClient
          .from("election_registrations")
          .select("type, payment_status, ameria_payment_id")
          .eq("user_id", user.id)
          .neq("status", "rejected")
      : Promise.resolve({ data: [] }),
  ]);

  const voterCount = Number(counts?.voter_count ?? 0);
  const candidateCount = Number(counts?.candidate_count ?? 0);
  const voterPct = Math.min(100, (voterCount / VOTER_GOAL) * 100);
  const candidatePct = Math.min(100, (candidateCount / CANDIDATE_GOAL) * 100);

  const myVoterReg = (myRegs ?? []).find(r => r.type === "voter") as { type: string; payment_status: string; ameria_payment_id: string | null } | undefined;
  const myCandidateReg = (myRegs ?? []).find(r => r.type === "candidate") as { type: string; payment_status: string; ameria_payment_id: string | null } | undefined;

  const payUrl = (paymentId: string | null) =>
    paymentId ? `https://services.ameriabank.am/VPOS/Payments/Pay?id=${paymentId}` : null;

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

      {/* Registration cards */}
      <div className="space-y-3">
        {/* Voter card — show only if not registered as candidate */}
        {!myCandidateReg && myVoterReg && (
          <div className={`rounded-2xl border-2 p-5 ${myVoterReg.payment_status === "paid" ? "border-green-500/30 bg-green-50" : "border-yellow-400/30 bg-yellow-50"}`}>
            <div className="flex items-center gap-3 mb-3">
              {myVoterReg.payment_status === "paid"
                ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                : <Clock className="h-5 w-5 text-yellow-600 shrink-0" />}
              <div>
                <p className="font-bold text-base">{L.elections.registeredVoterBadge}</p>
                <p className="text-xs text-muted-foreground">
                  {myVoterReg.payment_status === "paid" ? L.elections.registeredVoterDesc : L.elections.registeredPendingDesc}
                </p>
              </div>
              <span className="text-2xl ml-auto">🗳</span>
            </div>
            {myVoterReg.payment_status !== "paid" && payUrl(myVoterReg.ameria_payment_id) && (
              <a
                href={payUrl(myVoterReg.ameria_payment_id)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold py-2 mb-2 transition-colors"
              >
                {L.elections.continueToPayment} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <CancelRegistrationButton type="voter" />
          </div>
        )}
        {!myCandidateReg && !myVoterReg && (
          <Link href="/elections/register?type=voter" className="block rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base">{L.elections.registerVoter}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{L.elections.voterFeeLabel}: {formatAMD(VOTER_FEE)}</p>
              </div>
              <span className="text-2xl">🗳</span>
            </div>
          </Link>
        )}

        {/* Candidate card — show only if not registered as voter */}
        {!myVoterReg && myCandidateReg && (
          <div className={`rounded-2xl border-2 p-5 ${myCandidateReg.payment_status === "paid" ? "border-green-500/30 bg-green-50" : "border-yellow-400/30 bg-yellow-50"}`}>
            <div className="flex items-center gap-3 mb-3">
              {myCandidateReg.payment_status === "paid"
                ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                : <Clock className="h-5 w-5 text-yellow-600 shrink-0" />}
              <div>
                <p className="font-bold text-base">{L.elections.registeredCandidateBadge}</p>
                <p className="text-xs text-muted-foreground">
                  {myCandidateReg.payment_status === "paid" ? L.elections.registeredCandidateDesc : L.elections.registeredPendingDesc}
                </p>
              </div>
              <span className="text-2xl ml-auto">🏛</span>
            </div>
            {myCandidateReg.payment_status !== "paid" && payUrl(myCandidateReg.ameria_payment_id) && (
              <a
                href={payUrl(myCandidateReg.ameria_payment_id)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold py-2 mb-2 transition-colors"
              >
                {L.elections.continueToPayment} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <CancelRegistrationButton type="candidate" />
          </div>
        )}
        {!myVoterReg && !myCandidateReg && (
          <Link href="/elections/register?type=candidate" className="block rounded-2xl border-2 border-green-500/20 bg-green-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base">{L.elections.registerCandidate}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{L.elections.candidateFeeLabel}: {formatAMD(CANDIDATE_FEE)}</p>
              </div>
              <span className="text-2xl">🏛</span>
            </div>
          </Link>
        )}
      </div>

      {/* Candidates list */}
      <div className="space-y-3">
        <h2 className="font-bold text-base">{L.elections.candidatesTitle}</h2>
        {!candidates || candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{L.elections.candidatesEmpty}</p>
        ) : (
          <div className="space-y-2">
            {candidates.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border px-4 py-3">
                <span className="text-sm font-bold text-muted-foreground tabular-nums w-7 shrink-0">
                  {L.elections.candidateNumber.replace("{n}", String(i + 1))}
                </span>
                <span className="text-sm font-medium">{c.full_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
