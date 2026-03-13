import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Vote, CheckCircle2 } from "lucide-react";
import { PollVoteForm } from "@/components/volunteer/PollVoteForm";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const { data: poll } = await adminClient
    .from("polls")
    .select("id, title, description, status, allow_multiple, expires_at, points_per_vote")
    .eq("id", params.id)
    .single();

  if (!poll || poll.status === "draft") redirect("/voting");

  const { data: options } = await adminClient
    .from("poll_options")
    .select("id, text, order_index")
    .eq("poll_id", params.id)
    .order("order_index");

  // User's own votes for this poll
  const { data: myVotes } = await supabase
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", params.id);

  const myVotedOptionIds = new Set((myVotes ?? []).map((v: { option_id: string }) => v.option_id));
  const hasVoted = myVotedOptionIds.size > 0;

  const now = new Date();
  const isExpired = poll.expires_at && new Date(poll.expires_at) <= now;
  const isClosed = poll.status === "closed" || isExpired;
  const canVote = !isClosed && !hasVoted;

  // Vote counts — only compute when voting is done (voted or closed)
  let countByOption: Record<string, number> = {};
  let totalVotes = 0;

  if (hasVoted || isClosed) {
    const { data: allVotes } = await adminClient
      .from("poll_votes")
      .select("option_id, user_id")
      .eq("poll_id", params.id)
      .limit(20_000);

    for (const v of allVotes ?? []) {
      countByOption[v.option_id] = (countByOption[v.option_id] ?? 0) + 1;
    }
    // For multi-choice polls use distinct voter count so percentages reflect
    // "% of voters who chose this option" rather than "% of all selections"
    totalVotes = poll.allow_multiple
      ? new Set((allVotes ?? []).map((v: { user_id: string }) => v.user_id)).size
      : (allVotes ?? []).length;
  }

  const statusLabel = isClosed
    ? L.volunteer.voting.pollClosed
    : L.volunteer.voting.activeTitle;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <Link
          href="/voting"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {L.volunteer.voting.title}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-snug">{poll.title}</h1>
          <Badge variant={isClosed ? "outline" : "success"} className="shrink-0">
            {statusLabel}
          </Badge>
        </div>
        {poll.description && (
          <p className="text-sm text-muted-foreground mt-2">{poll.description}</p>
        )}
        {poll.expires_at && !isClosed && (
          <p className="text-xs text-muted-foreground mt-1">
            {t(L.volunteer.voting.expiresAt, {
              date: new Date(poll.expires_at).toLocaleString(),
            })}
          </p>
        )}
      </div>

      {/* Voted confirmation banner */}
      {hasVoted && !isClosed && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {L.volunteer.voting.votedLabel}
        </div>
      )}

      {/* Vote form — only if can vote */}
      {canVote && (
        <Card>
          <CardContent className="pt-5 pb-5">
            {(poll.points_per_vote ?? 0) > 0 && (
              <p className="text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2 mb-4">
                +{poll.points_per_vote} {L.volunteer.voting.pointsForVoting}
              </p>
            )}
            <PollVoteForm
              pollId={poll.id}
              options={(options ?? []).map((o: { id: string; text: string }) => ({
                id: o.id,
                text: o.text,
              }))}
              allowMultiple={poll.allow_multiple}
            />
          </CardContent>
        </Card>
      )}

      {/* Results — shown after voting or when closed */}
      {(hasVoted || isClosed) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Vote className="h-4 w-4 text-primary" />
              {L.volunteer.voting.resultsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {(options ?? []).map((opt: { id: string; text: string }) => {
              const count = countByOption[opt.id] ?? 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isMyVote = myVotedOptionIds.has(opt.id);

              return (
                <div key={opt.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("font-medium", isMyVote && "text-primary")}>
                      {opt.text}
                      {isMyVote && (
                        <CheckCircle2 className="inline h-3.5 w-3.5 ml-1.5 text-primary" />
                      )}
                    </span>
                    <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                      {pct}%
                      <span className="text-xs ml-1">({count})</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        isMyVote ? "bg-primary" : "bg-primary/40"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">
              {poll.allow_multiple
                ? t(L.volunteer.voting.totalVoters ?? "{count} քվեարկող", { count: totalVotes })
                : t(L.volunteer.voting.totalVotes, { count: totalVotes })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
