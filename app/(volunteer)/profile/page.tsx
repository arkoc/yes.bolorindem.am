import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPoints, getRankSuffix } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/volunteer/SignOutButton";
import { Trophy, Zap, CheckCircle, Star, Settings } from "lucide-react";
import L from "@/lib/labels";

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, rankRes, statsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, total_points, role, created_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("leaderboard")
      .select("rank, total_completions")
      .eq("id", user.id)
      .single(),
    supabase
      .from("point_transactions")
      .select("amount, source_type, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;
  const rank = rankRes.data;
  const transactions = statsRes.data ?? [];

  if (!profile) redirect("/register");

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{L.volunteer.profile.title}</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} size={80} className="shrink-0" />
            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="text-muted-foreground text-sm">{profile.phone}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={profile.role === "admin" ? "default" : profile.role === "leader" ? "secondary" : "outline"}>
                  {profile.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  since {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-xl font-bold">{formatPoints(profile.total_points)}</p>
            <p className="text-xs text-muted-foreground">{L.volunteer.profile.statPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Trophy className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold">{rank?.rank ? getRankSuffix(Number(rank.rank)) : "—"}</p>
            <p className="text-xs text-muted-foreground">{L.volunteer.profile.statRank}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold">{rank?.total_completions ?? 0}</p>
            <p className="text-xs text-muted-foreground">{L.volunteer.profile.statTasksDone}</p>
          </CardContent>
        </Card>
      </div>

      {/* Point history */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              {L.volunteer.profile.recentPoints}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {transactions.map((tx: {
                amount: number;
                source_type: string;
                description: string | null;
                created_at: string;
              }, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.source_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`font-semibold text-sm ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount} pts
                    </span>
                  </div>
                  {i < transactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin link */}
      {(profile.role === "admin" || profile.role === "leader") && (
        <Button asChild variant="outline" className="w-full">
          <Link href="/admin">
            <Settings className="h-4 w-4" />
            {L.volunteer.profile.adminPanel}
          </Link>
        </Button>
      )}

      <SignOutButton />
    </div>
  );
}
