"use client";

import { PM_NOMINATION_THRESHOLD } from "@/lib/elections-config";
import PmNominationForm from "@/components/elections/PmNominationForm";
import PmVoterForm from "@/components/elections/PmVoterForm";
import { CheckCircle2 } from "lucide-react";

interface Nominee {
  nominee_name: string;
  nomination_count: number;
}

interface PmPageClientProps {
  nominees: Nominee[];
  currentNomination: string | null;
  currentVoterEmail: string | null;
  isDeadlinePassed: boolean;
  user: any;
  deadlineFormatted: string;
}

export default function PmPageClient({
  nominees,
  currentNomination,
  currentVoterEmail,
  isDeadlinePassed,
  user,
  deadlineFormatted,
}: PmPageClientProps) {
  const totalNominations = nominees.reduce((sum, n) => sum + n.nomination_count, 0);
  const isRegisteredAsVoter = !!currentVoterEmail;

  // Split nominees into official (≥threshold) and pending (<threshold)
  const officialsNominees = nominees.filter((n) => n.nomination_count >= PM_NOMINATION_THRESHOLD);
  const pendingNominees = nominees.filter((n) => n.nomination_count < PM_NOMINATION_THRESHOLD);

  return (
    <>
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-red-800 text-white px-6 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-200 mb-1">
          Վարչապետի ընտրություն
        </p>
        <h1 className="text-2xl font-bold leading-tight mb-2">Վարչապետի թեկնածու</h1>
        <p className="text-red-100 text-sm mb-1">Վերջնաժամկետ՝ {deadlineFormatted}</p>
        <p className="text-red-100 text-sm">{totalNominations} առաջադրություններ</p>
      </div>

      {/* 1. Register as Voter */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Գրանցվել որպես ընտրող</h2>
        <PmVoterForm
          currentEmail={currentVoterEmail}
          isDeadlinePassed={isDeadlinePassed}
          isLoggedIn={!!user}
        />
      </div>

      {/* 2. Promote a Candidate (optional, only if registered) */}
      {isRegisteredAsVoter && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Առաջադրել վարչապետի թեկնածու (ցանկալի)</h2>
          <PmNominationForm
            currentNomination={currentNomination}
            nomineesList={nominees}
            isDeadlinePassed={isDeadlinePassed}
            isLoggedIn={!!user}
          />
        </div>
      )}

      {/* 3. Candidates List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Թեկնածուներ</h2>

        {/* Official PM Candidates */}
        {officialsNominees.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Առաջադրված թեկնածուներ
            </h3>
            <div className="space-y-2">
              {officialsNominees.map((nominee) => (
                <div
                  key={nominee.nominee_name}
                  className="flex items-center justify-between rounded-lg border bg-green-50 px-4 py-3"
                >
                  <span className="font-semibold">{nominee.nominee_name}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-xs font-semibold px-3 py-1">
                    ✓ {nominee.nomination_count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Nominees */}
        {pendingNominees.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Առաջադրության մեջ</h3>
            <div className="space-y-2">
              {pendingNominees.map((nominee) => {
                const progress = (nominee.nomination_count / PM_NOMINATION_THRESHOLD) * 100;
                return (
                  <div
                    key={nominee.nominee_name}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{nominee.nominee_name}</span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {nominee.nomination_count}/{PM_NOMINATION_THRESHOLD}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {nominees.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Թեկնածուներ դեռ առաջադրված չեն</p>
          </div>
        )}
      </div>
    </>
  );
}
