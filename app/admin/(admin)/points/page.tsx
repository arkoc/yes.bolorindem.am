import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualPointGrantForm } from "@/components/admin/ManualPointGrantForm";
import L from "@/lib/labels";

export default async function AdminPointsPage() {
  const supabase = await createAdminClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, total_points")
    .order("full_name");

  const { data: recentGrants } = await supabase
    .from("point_transactions")
    .select("id, amount, description, created_at")
    .in("source_type", ["admin_grant", "reversal"])
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{L.admin.points.title}</h1>
        <p className="text-muted-foreground text-sm">{L.admin.points.subtitle}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{L.admin.points.grantCardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualPointGrantForm users={users ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{L.admin.points.recentGrantsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(recentGrants ?? []).length > 0 ? (
              (recentGrants ?? []).map((g: {
                id: string;
                amount: number;
                description: string | null;
                created_at: string;
              }) => (
                <div key={g.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{g.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(g.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-semibold text-sm ${g.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {g.amount > 0 ? "+" : ""}{g.amount} pts
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm px-5">
                {L.admin.points.emptyGrants}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
