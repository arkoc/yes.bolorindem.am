import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Vote, Plus, Users, ChevronRight } from "lucide-react";
import L, { t } from "@/lib/labels";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  active: "success",
  closed: "outline",
};

export default async function AdminVotingPage() {
  const adminClient = createAdminClient();

  const { data: polls } = await adminClient
    .from("polls")
    .select("id, title, status, allow_multiple, expires_at, points_per_vote, created_at, poll_votes(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="h-6 w-6 text-primary" />
            {L.admin.voting.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{L.admin.voting.subtitle}</p>
        </div>
        <Button asChild>
          <Link href="/admin/voting/new">
            <Plus className="h-4 w-4" /> {L.admin.voting.newBtn}
          </Link>
        </Button>
      </div>

      {polls && polls.length > 0 ? (
        <div className="space-y-2">
          {polls.map((p: {
            id: string;
            title: string;
            status: string;
            allow_multiple: boolean;
            expires_at: string | null;
            points_per_vote: number;
            created_at: string;
            poll_votes: { count: number }[];
          }) => {
            const voteCount = p.poll_votes?.[0]?.count ?? 0;
            const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
            const effectiveStatus = (p.status === "active" && isExpired) ? "closed" : p.status;

            return (
              <Card key={p.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={statusVariant[effectiveStatus] ?? "outline"} className="text-xs capitalize">
                          {effectiveStatus}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {t(L.admin.voting.voteCount, { count: voteCount })}
                        </span>
                        {(p.points_per_vote ?? 0) > 0 && (
                          <span className="text-xs text-green-600">+{p.points_per_vote} pts</span>
                        )}
                        {p.allow_multiple && (
                          <span className="text-xs text-muted-foreground">· multi</span>
                        )}
                        {p.expires_at && (
                          <span className="text-xs text-muted-foreground">
                            · {new Date(p.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link href={`/admin/voting/${p.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-3">{L.admin.voting.emptyTitle}</h3>
            <Button asChild>
              <Link href="/admin/voting/new">
                <Plus className="h-4 w-4" /> {L.admin.voting.createFirst}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
