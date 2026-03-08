import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, ChevronRight, CheckCircle2, Clock } from "lucide-react";
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

    return (
      <Link href={`/voting/${p.id}`}>
        <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{p.title}</p>
                  {voted && !closed && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {L.volunteer.voting.votedLabel}
                    </Badge>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{optionCount} options</span>
                  <span>{t(L.volunteer.voting.totalVotes, { count: voteCount })}</span>
                  {(p.points_per_vote ?? 0) > 0 && !closed && (
                    <span className="text-green-600 font-medium">+{p.points_per_vote} pts</span>
                  )}
                  {p.expires_at && !closed && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t(L.volunteer.voting.expiresAt, { date: new Date(p.expires_at).toLocaleDateString() })}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {L.volunteer.voting.activeTitle}
        </h2>
        {activePollsList.length > 0 ? (
          activePollsList.map((p: Parameters<typeof PollCard>[0]["p"] & { id: string }) => (
            <PollCard key={p.id} p={p} voted={votedPollIds.has(p.id)} closed={false} />
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">{L.volunteer.voting.emptyActive}</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Closed polls */}
      {closedPollsList.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {L.volunteer.voting.closedTitle}
          </h2>
          {closedPollsList.map((p: Parameters<typeof PollCard>[0]["p"] & { id: string }) => (
            <PollCard key={p.id} p={p} voted={votedPollIds.has(p.id)} closed={true} />
          ))}
        </section>
      )}
    </div>
  );
}
