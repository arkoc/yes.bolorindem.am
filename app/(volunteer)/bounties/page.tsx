import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Plus, Repeat2, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatPoints } from "@/lib/utils";
import L from "@/lib/labels";
import { BountiesOthersList } from "@/components/volunteer/BountiesOthersList";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type BountyItem = {
  id: string;
  title: string;
  description: string | null;
  reward_points: number;
  is_repeatable: boolean;
  max_completions: number | null;
  status: string;
  created_at: string;
  creator_id: string;
  creator: { full_name: string } | null;
  completions: { status: string }[];
};

type CompletionItem = {
  id: string;
  status: string;
  created_at: string;
  bounty: BountyItem | null;
};

export default async function BountiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "others" } = await searchParams;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", user.id)
    .single();
  const userPoints = profile?.total_points ?? 0;

  const [othersResult, mineResult, completionsResult] = await Promise.all([
    tab === "others"
      ? supabase
          .from("user_bounties")
          .select("id, title, description, reward_points, is_repeatable, max_completions, status, created_at, creator_id, creator:profiles!user_bounties_creator_id_fkey(full_name), completions:bounty_completions(status)")
          .eq("status", "open")
          .neq("creator_id", user.id)
          .order("reward_points", { ascending: false })
          .range(0, PAGE_SIZE)
      : Promise.resolve({ data: [] }),
    tab === "mine"
      ? supabase
          .from("user_bounties")
          .select("id, title, description, reward_points, is_repeatable, max_completions, status, created_at, creator_id, creator:profiles!user_bounties_creator_id_fkey(full_name), completions:bounty_completions(status)")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    tab === "mine"
      ? supabase
          .from("bounty_completions")
          .select("id, status, created_at, bounty:user_bounties(id, title, reward_points, is_repeatable, max_completions, status, created_at, creator_id, creator:profiles!user_bounties_creator_id_fkey(full_name))")
          .eq("user_id", user.id)
          .neq("status", "rejected")
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  const othersRaw = (othersResult.data ?? []) as unknown as BountyItem[];
  const initialHasMore = othersRaw.length > PAGE_SIZE;
  const initialOthers = initialHasMore ? othersRaw.slice(0, PAGE_SIZE) : othersRaw;

  const myBounties = (mineResult.data ?? []) as unknown as BountyItem[];
  const myCompletions = (completionsResult.data ?? []) as unknown as CompletionItem[];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pt-2 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{L.bounty.pageTitle}</h1>
            <p className="text-muted-foreground text-sm mt-1">{L.bounty.pageSubtitle}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1 mt-1 hidden sm:inline-flex">
            <Link href="/bounties/create">
              <Plus className="h-3.5 w-3.5" />
              {L.bounty.createTitle}
            </Link>
          </Button>
        </div>
        <Button asChild className="w-full gap-2 sm:hidden">
          <Link href="/bounties/create">
            <Plus className="h-4 w-4" />
            {L.bounty.createTitle}
            <span className="ml-auto text-xs opacity-75 font-normal flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />{formatPoints(userPoints)}
            </span>
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <Link
          href="/bounties"
          className={`flex-1 text-center text-sm py-1.5 rounded-md font-medium transition-colors ${
            tab === "others"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {L.bounty.tabOthers}
        </Link>
        <Link
          href="/bounties?tab=mine"
          className={`flex-1 text-center text-sm py-1.5 rounded-md font-medium transition-colors ${
            tab === "mine"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {L.bounty.tabMine}
        </Link>
      </div>

      {/* Others tab */}
      {tab === "others" && (
        <BountiesOthersList
          initialBounties={initialOthers}
          initialHasMore={initialHasMore}
          excludeUserId={user.id}
        />
      )}

      {/* Mine tab */}
      {tab === "mine" && (
        <div className="space-y-6">
          {/* Bounties I created */}
          <section className="space-y-3">
            {myBounties.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{L.bounty.noMyBounties}</p>
            ) : (
              myBounties.map((b) => <BountyCard key={b.id} b={b} showStatus />)
            )}
          </section>

          {/* Bounties I completed for others */}
          {myCompletions.filter(c => c.bounty).length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {L.bounty.groupMyCompletedBounties}
              </h2>
              {myCompletions.filter(c => c.bounty).map((c) => (
                <Link key={c.id} href={`/bounties/${c.bounty!.id}`} className="block">
                  <Card className="hover:shadow-md transition-all active:scale-[0.99] cursor-pointer border-l-4 border-l-muted-foreground/30 opacity-80">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug text-muted-foreground">
                          {c.bounty!.title}
                        </CardTitle>
                        <Badge
                          variant={c.status === "accepted" ? "success" : c.status === "disputed" ? "destructive" : "warning"}
                          className="text-xs shrink-0"
                        >
                          +{c.bounty!.reward_points}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5" />
                        {L.bounty.bountyLabel} · {c.bounty!.creator?.full_name}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );

  function BountyCard({ b, showStatus = false }: { b: BountyItem; showStatus?: boolean }) {
    const closed = b.status !== "open";
    const acceptedCount = b.completions?.filter(c => c.status === "accepted" || c.status === "disputed").length ?? 0;
    return (
      <Link href={`/bounties/${b.id}`} className="block">
        <Card className={`hover:shadow-md transition-all active:scale-[0.99] cursor-pointer border-l-4 ${closed ? "border-l-muted-foreground/30 opacity-75" : "border-l-yellow-500"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className={`text-base leading-snug ${closed ? "text-muted-foreground" : ""}`}>
                {b.title}
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                {showStatus && closed && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {b.status === "closed" ? L.bounty.statusClosed : L.bounty.statusCancelled}
                  </Badge>
                )}
                {b.is_repeatable && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Repeat2 className="h-3 w-3" />
                    {acceptedCount}/{b.max_completions ?? "∞"}
                  </Badge>
                )}
                <Badge variant={closed ? "outline" : "success"} className="text-xs">
                  +{b.reward_points}
                </Badge>
              </div>
            </div>
            {b.description && (
              <CardDescription className="text-sm line-clamp-2">{b.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                {L.bounty.bountyLabel} · {b.creator?.full_name}
              </span>
              {!closed && (
                <div className="flex items-center gap-1 text-primary">
                  <span className="text-xs font-semibold">{L.volunteer.dashboard.startBtn}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }
}
