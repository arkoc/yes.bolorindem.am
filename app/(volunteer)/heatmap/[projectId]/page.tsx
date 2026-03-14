import { redirect, notFound } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import nextDynamic from "next/dynamic";
import { type HeatmapPoint } from "@/components/volunteer/heatmap-types";

export const dynamic = "force-dynamic";

// Load map client-side only (MapLibre GL requires browser)
const HeatmapMapView = nextDynamic(
  () => import("@/components/volunteer/HeatmapMapView").then((m) => m.HeatmapMapView),
  { ssr: false }
);

export default async function HeatmapPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Load project using admin client to bypass RLS (allows draft/non-active projects)
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type, status")
    .eq("id", projectId)
    .eq("project_type", "heatmap")
    .single();

  if (!project) notFound();

  // Paginate to load all points past the 1000-row PostgREST cap
  const PAGE = 1000;
  let rawPoints: { id: string; lat: number; lng: number; points: number; claimed_by: string | null; claimed_at: string | null; profiles: { full_name: string } | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await admin
      .from("heatmap_points")
      .select("id, lat, lng, points, claimed_by, claimed_at, profiles(full_name)")
      .eq("project_id", projectId)
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    rawPoints = rawPoints.concat(data as unknown as typeof rawPoints);
    if (data.length < PAGE) break;
  }
  const points: HeatmapPoint[] = rawPoints.map((p) => ({
    ...p,
    claimer_name: p.profiles?.full_name ?? null,
    profiles: undefined,
  }));

  return (
    <div style={{ width: "100%", height: "100dvh", overflow: "hidden" }}>
      <HeatmapMapView
        initialPoints={points}
        projectId={projectId}
        currentUserId={user.id}
        currentUserName={profile?.full_name ?? ""}
      />
    </div>
  );
}
