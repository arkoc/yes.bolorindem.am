import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import L, { t } from "@/lib/labels";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  total_points: number;
  rank: number;
  total_completions: number;
}

export default async function LeaderboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: entries, error: lbError } = await adminClient
    .from("leaderboard")
    .select("id, full_name, total_points, rank, total_completions")
    .order("rank")
    .limit(50);

  if (lbError) console.error("Leaderboard query error:", lbError);

  const myEntry = entries?.find((e: LeaderboardEntry) => e.id === user.id);

  const rankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-xl leading-none">🥇</span>;
    if (rank === 2) return <span className="text-xl leading-none">🥈</span>;
    if (rank === 3) return <span className="text-xl leading-none">🥉</span>;
    return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🏆 {L.volunteer.leaderboard.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{L.volunteer.leaderboard.subtitle}</p>
      </div>

      {/* My position (sticky if not in top view) */}
      {myEntry && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center shrink-0">
                {rankIcon(Number(myEntry.rank))}
              </div>
              <UserAvatar name={myEntry.full_name} size={40} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{t(L.volunteer.leaderboard.me, { name: myEntry.full_name })}</p>
                <p className="text-xs text-muted-foreground">{t(L.volunteer.leaderboard.completions, { count: myEntry.total_completions })}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-primary flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  {formatPoints(myEntry.total_points)}
                </p>
                <p className="text-xs text-muted-foreground">{t(L.volunteer.dashboard.rankDisplay, { rank: getRankSuffix(Number(myEntry.rank)) })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full leaderboard */}
      <Card>
        <CardContent className="p-0">
          {entries && entries.length > 0 ? (
            <div className="divide-y">
              {entries.map((entry: LeaderboardEntry) => {
                const isMe = entry.id === user.id;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4",
                      isMe && "bg-primary/5"
                    )}
                  >
                    <div className="w-8 flex justify-center shrink-0">
                      {rankIcon(Number(entry.rank))}
                    </div>
                    <UserAvatar name={entry.full_name} size={36} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isMe && "text-primary font-semibold")}>
                        {entry.full_name}
                        {isMe && <span className="ml-1 text-xs font-normal opacity-70">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{t(L.volunteer.leaderboard.completions, { count: entry.total_completions })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm flex items-center gap-1 justify-end whitespace-nowrap">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        {formatPoints(entry.total_points)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">{L.volunteer.leaderboard.emptyText}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
