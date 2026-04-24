import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = createServerClient();
  const adminClient = createAdminClient();

  // Get current user and check if admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["admin", "leader"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all nominations with profile names
  const { data: nominations, error } = await adminClient
    .from("pm_nominations")
    .select("id, user_id, nominee_name, nominator_email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching nominations:", error);
    return NextResponse.json(
      { error: "Failed to fetch nominations" },
      { status: 500 }
    );
  }

  // Enrich with profile names
  const enriched = await Promise.all(
    (nominations || []).map(async (nom) => {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", nom.user_id)
        .single();

      return {
        ...nom,
        profile_name: profile?.full_name || "Unknown",
      };
    })
  );

  return NextResponse.json(enriched);
}
