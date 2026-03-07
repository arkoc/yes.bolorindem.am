import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Vote } from "lucide-react";
import { PollStatusActions } from "@/components/admin/PollStatusActions";
import L, { t } from "@/lib/labels";

export default async function AdminPollDetailPage({ params }: { params: { id: string } }) {
  const adminClient = createAdminClient();

  const { data: poll } = await adminClient
    .from("polls")
    .select("id, title, description, status, allow_multiple, expires_at, notify_on_publish, points_per_vote, created_at")
    .eq("id", params.id)
    .single();

  if (!poll) redirect("/admin/voting");

  const { data: options } = await adminClient
    .from("poll_options")
    .select("id, text, order_index")
    .eq("poll_id", params.id)
    .order("order_index");

  // Get vote counts per option
  const optionIds = (options ?? []).map((o: { id: string }) => o.id);
  const { data: votes } = await adminClient
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", params.id)
    .limit(20_000);

  const votesArr = votes ?? [];
  const totalVotes = votesArr.length;
  const countByOption: Record<string, number> = {};
  for (const v of votesArr) countByOption[v.option_id] = (countByOption[v.option_id] ?? 0) + 1;

  // Unique voter count
  const uniqueVoters = new Set(votesArr.map((v: { option_id: string }) => v.option_id)).size;
  // Actually count unique user_ids — we need to query differently
  const { count: voterCount } = await adminClient
    .from("poll_votes")
    .select("user_id", { count: "exact", head: false })
    .eq("poll_id", params.id);

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const effectiveStatus = (poll.status === "active" && isExpired) ? "closed" : poll.status;

  const statusVariant: Record<string, "default" | "secondary" | "outline" | "success"> = {
    draft: "secondary",
    active: "success",
    closed: "outline",
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Link
          href="/admin/voting"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> {L.admin.voting.backLink}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground text-sm mt-1">{poll.description}</p>
            )}
          </div>
          <Badge variant={statusVariant[effectiveStatus] ?? "outline"} className="capitalize shrink-0">
            {effectiveStatus}
          </Badge>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {t(L.admin.voting.totalVotes, { count: totalVotes })}
        </span>
        {poll.allow_multiple && <span>· {L.admin.voting.allowMultiple}</span>}
        {(poll.points_per_vote ?? 0) > 0 && (
          <span>· +{poll.points_per_vote} {L.admin.voting.pointsPerVoteLabel}</span>
        )}
        {poll.expires_at && (
          <span>· {L.admin.voting.expiryLabel}: {new Date(poll.expires_at).toLocaleString()}</span>
        )}
      </div>

      {/* Status actions */}
      <PollStatusActions pollId={poll.id} status={effectiveStatus} />

      {/* Results */}
      {optionIds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Vote className="h-4 w-4 text-primary" />
              {L.admin.voting.optionsLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {(options ?? []).map((opt: { id: string; text: string }) => {
              const count = countByOption[opt.id] ?? 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <div key={opt.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{opt.text}</span>
                    <span className="text-muted-foreground tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">
              {t(L.admin.voting.totalVotes, { count: totalVotes })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
