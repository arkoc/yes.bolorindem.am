import { redirect, notFound } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHeatmapPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();

  // Load project
  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type")
    .eq("id", projectId)
    .single();

  if (!project || project.project_type !== "heatmap") notFound();

  // Load all heatmap points with claimer profile
  const { data: pointsRaw } = await admin
    .from("heatmap_points")
    .select("id, lat, lng, points, claimed_by, claimed_at, profiles(full_name)")
    .eq("project_id", projectId)
    .order("claimed_at", { ascending: false, nullsFirst: false });

  const points = (pointsRaw ?? []) as unknown as {
    id: string;
    lat: number;
    lng: number;
    points: number;
    claimed_by: string | null;
    claimed_at: string | null;
    profiles: { full_name: string } | null;
  }[];

  const total = points.length;
  const claimed = points.filter((p) => p.claimed_by !== null).length;
  const totalPointsAwarded = points
    .filter((p) => p.claimed_by !== null)
    .reduce((sum, p) => sum + p.points, 0);
  const pct = total > 0 ? Math.round((claimed / total) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/projects"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">Heatmap — admin view</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total dots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{claimed}</p>
            <p className="text-xs text-muted-foreground mt-1">Claimed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{totalPointsAwarded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Points awarded</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground">{claimed} / {total} dots claimed</p>
        </CardContent>
      </Card>

      {/* Claimed dots table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Claimed dots ({claimed})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {claimed === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No dots claimed yet</p>
          ) : (
            <div className="space-y-2">
              {points
                .filter((p) => p.claimed_by !== null)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {p.profiles?.full_name ?? p.claimed_by?.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        +{p.points} pts
                      </Badge>
                      {p.claimed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(p.claimed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
