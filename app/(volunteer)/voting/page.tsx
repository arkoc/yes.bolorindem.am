import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";

export default async function VotingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  // Fetch all active + closed polls
  const { data: polls } = await adminClient
    .from("polls")
    .select("id, title, description, status, allow_multiple, expires_at, points_per_vote, created_at, poll_options(count), poll_votes(count)")
    .in("status", ["active", "closed"])
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch user's votes (just poll_ids they voted on)
  const { data: userVotes } = await supabase
    .from("poll_votes")
    .select("poll_id");

  const votedPollIds = new Set((userVotes ?? []).map((v: { poll_id: string }) => v.poll_id));

  const now = new Date();

  const activePollsList = (polls ?? []).filter((p: { status: string; expires_at: string | null }) =>
    p.status === "active" && (!p.expires_at || new Date(p.expires_at) > now)
  );
  const closedPollsList = (polls ?? []).filter((p: { status: string; expires_at: string | null }) =>
    p.status === "closed" || (p.status === "active" && p.expires_at && new Date(p.expires_at) <= now)
  );

  function PollCard({ p, voted, closed }: {
    p: {
      id: string;
      title: string;
      description: string | null;
      allow_multiple: boolean;
      expires_at: string | null;
      points_per_vote: number;
      poll_options: { count: number }[];
      poll_votes: { count: number }[];
    };
    voted: boolean;
    closed: boolean;
  }) {
    const optionCount = p.poll_options?.[0]?.count ?? 0;
    const voteCount = p.poll_votes?.[0]?.count ?? 0;

    const daysLeft = p.expires_at && !closed
      ? Math.ceil((new Date(p.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Link href={`/voting/${p.id}`}>
        <Card className={cn(
          "hover:shadow-md active:scale-[0.99] transition-all cursor-pointer border-l-4",
          closed
            ? "border-l-muted-foreground/30 opacity-75"
            : voted
              ? "border-l-green-500"
              : "border-l-primary"
        )}>
          <CardContent className="py-4 px-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("font-medium text-sm", closed && "text-muted-foreground")}>{p.title}</p>
                  {voted && !closed && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {L.volunteer.voting.votedLabel}
                    </Badge>
                  )}
                  {closed && (
                    <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                      <Lock className="h-3 w-3 mr-1" />
                      {L.volunteer.voting.pollClosed}
                    </Badge>
                  )}
                  {daysLeft !== null && daysLeft >= 0 && (
                    <Badge variant={daysLeft === 0 ? "destructive" : daysLeft <= 3 ? "warning" : "secondary"} className="text-xs shrink-0">
                      {daysLeft === 0 ? L.volunteer.projects.lastDay : t(L.volunteer.projects.daysLeft, { days: daysLeft })}
                    </Badge>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{p.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{t(L.volunteer.voting.optionCount, { count: optionCount })}</span>
                  <span>{t(L.volunteer.voting.totalVotes, { count: voteCount })}</span>
                  {(p.points_per_vote ?? 0) > 0 && !closed && !voted && (
                    <span className="text-green-600 font-semibold">+{p.points_per_vote} pts</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Vote className="h-6 w-6 text-primary" />
          {L.volunteer.voting.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{L.volunteer.voting.subtitle}</p>
      </div>

      {/* Active polls */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {L.volunteer.voting.activeTitle}
        </h2>
        <div className="flex flex-col gap-3">
          {activePollsList.length > 0 ? (
            activePollsList.map((p: Parameters<typeof PollCard>[0]["p"] & { id: string }) => (
              <PollCard key={p.id} p={p} voted={votedPollIds.has(p.id)} closed={false} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Vote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{L.volunteer.voting.emptyActive}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Closed polls */}
      {closedPollsList.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {L.volunteer.voting.closedTitle}
          </h2>
          <div className="flex flex-col gap-3">
            {closedPollsList.map((p: Parameters<typeof PollCard>[0]["p"] & { id: string }) => (
              <PollCard key={p.id} p={p} voted={votedPollIds.has(p.id)} closed={true} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
