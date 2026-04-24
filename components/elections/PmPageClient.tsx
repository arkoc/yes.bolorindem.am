"use client";

import { PM_NOMINATION_THRESHOLD } from "@/lib/elections-config";
import PmNominationForm from "@/components/elections/PmNominationForm";
import { CheckCircle2 } from "lucide-react";

interface Nominee {
  nominee_name: string;
  nomination_count: number;
}

interface PmPageClientProps {
  nominees: Nominee[];
  currentNomination: string | null;
  currentEmail: string | null;
  isDeadlinePassed: boolean;
  user: any;
  deadlineFormatted: string;
}

export default function PmPageClient({
  nominees,
  currentNomination,
  currentEmail,
  isDeadlinePassed,
  user,
  deadlineFormatted,
}: PmPageClientProps) {
  const totalNominations = nominees.reduce((sum, n) => sum + n.nomination_count, 0);

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

      {/* Nomination Form */}
      <PmNominationForm
        currentNomination={currentNomination}
        currentEmail={currentEmail}
        isDeadlinePassed={isDeadlinePassed}
        isLoggedIn={!!user}
      />

      {/* Official PM Candidates */}
      {officialsNominees.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Թեկնածուներ
          </h2>
          <div className="space-y-2">
            {officialsNominees.map((nominee) => (
              <div
                key={nominee.nominee_name}
                className="flex items-center justify-between rounded-lg border bg-green-50 px-4 py-3"
              >
                <span className="font-semibold">{nominee.nominee_name}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-xs font-semibold px-3 py-1">
                  ✓ Թեկնածու է
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Nominees */}
      {pendingNominees.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Առաջադրության մեջ</h2>
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
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Թեկնածուներ դեռ առաջադրված չեն</p>
        </div>
      )}
    </>
  );
}
