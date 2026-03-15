import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CLAIM_RADIUS_METERS = 20;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { pointId?: string; lat?: number; lng?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { pointId, lat, lng } = body;
  if (!pointId || lat == null || lng == null) {
    return NextResponse.json({ error: "Missing pointId, lat, or lng" }, { status: 400 });
  }

  // Load the point (verify it belongs to this project)
  const { data: point, error: pointError } = await supabase
    .from("heatmap_points")
    .select("id, lat, lng, project_id, claimed_by")
    .eq("id", pointId)
    .eq("project_id", projectId)
    .single();

  if (pointError || !point) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Server-side proximity check
  const dist = Math.round(haversineMeters(lat, lng, point.lat, point.lng));
  if (dist > CLAIM_RADIUS_METERS) {
    return NextResponse.json(
      { ok: false, reason: "too_far", distance: dist },
      { status: 422 }
    );
  }

  // Call SECURITY DEFINER function via admin client (bypasses RLS for atomic lock)
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_heatmap_point", {
    p_point_id: pointId,
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
