import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { VOTER_GOAL, CANDIDATE_GOAL, formatAMD, VOTER_FEE, VOTER_POINTS } from "@/lib/elections-config";
import L from "@/lib/labels";
import { CancelRegistrationButton } from "@/components/elections/CancelRegistrationButton";
import { PaymentToast } from "@/components/elections/PaymentToast";

export const dynamic = "force-dynamic";

export default async function ElectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const adminClient = createAdminClient();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: counts }, { data: myRegs }] = await Promise.all([
    adminClient.from("election_counts").select("*").single(),
    user
      ? adminClient
          .from("election_registrations")
          .select("type, payment_status")
          .eq("user_id", user.id)
          .neq("status", "rejected")
      : Promise.resolve({ data: [] }),
  ]);

  const voterCount = Number(counts?.voter_count ?? 0);
  const candidateCount = Number(counts?.candidate_count ?? 0);
  const voterPct = Math.min(100, (voterCount / VOTER_GOAL) * 100);
  const candidatePct = Math.min(100, (candidateCount / CANDIDATE_GOAL) * 100);

  const myVoterReg = (myRegs ?? []).find(r => r.type === "voter") as { type: string; payment_status: string } | undefined;
  const myCandidateReg = (myRegs ?? []).find(r => r.type === "candidate") as { type: string; payment_status: string } | undefined;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-8">
      <PaymentToast status={payment} />
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
            <div className="space-y-2">
              {myVoterReg.payment_status !== "paid" && (
                <Link href="/elections/register?type=voter" className="flex items-center justify-center gap-2 w-full rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold py-2 transition-colors">
                  {L.elections.viewPaymentDetails}
                </Link>
              )}
              {myVoterReg.payment_status !== "paid" && <CancelRegistrationButton type="voter" />}
            </div>
          </div>
        )}
        {!myCandidateReg && !myVoterReg && (
          <Link href="/elections/register?type=voter" className="block rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base">{L.elections.registerVoter}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{L.elections.voterFeeLabel}: {formatAMD(VOTER_FEE)}</p>
                <p className="text-xs text-yellow-600 font-semibold mt-1">+{VOTER_POINTS.toLocaleString()} միավոր</p>
              </div>
              <span className="text-2xl">🗳</span>
            </div>
          </Link>
        )}

        {/* Candidate status card — read-only, for existing candidates */}
        {myCandidateReg && (
          <div className={`rounded-2xl border-2 p-5 ${myCandidateReg.payment_status === "paid" ? "border-green-500/30 bg-green-50" : "border-yellow-400/30 bg-yellow-50"}`}>
            <div className="flex items-center gap-3">
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
          </div>
        )}
      </div>

      {/* Party candidates link */}
      <Link
        href="/candidates"
        className="flex items-center justify-between rounded-2xl border-2 border-primary/20 bg-primary/5 px-5 py-4 hover:bg-primary/10 transition-colors"
      >
        <div>
          <p className="font-bold text-base">Կուսակցության թեկնածուների ցուցակ</p>
          <p className="text-sm text-muted-foreground mt-0.5">{candidateCount} թեկնածու</p>
        </div>
        <ExternalLink className="h-4 w-4 text-primary shrink-0" />
      </Link>
    </div>
  );
}
