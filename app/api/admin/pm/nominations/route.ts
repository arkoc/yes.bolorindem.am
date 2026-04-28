import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createServerClient();
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
      { error: `Failed to fetch nominations: ${error.message}` },
      { status: 500 }
    );
  }

  if (!nominations || nominations.length === 0) {
    return NextResponse.json([]);
  }

  // Enrich with profile names and banned status
  const enriched = await Promise.allSettled(
    (nominations || []).map(async (nom) => {
      try {
        const { data: profile, error: profileError } = await adminClient
          .from("profiles")
          .select("full_name, banned, ban_reason")
          .eq("id", nom.user_id)
          .single();

        if (profileError) {
          console.error(`Error fetching profile for user ${nom.user_id}:`, profileError);
        }

        return {
          ...nom,
          profile_name: profile?.full_name || "Unknown",
          banned: profile?.banned || false,
          ban_reason: profile?.ban_reason || null,
        };
      } catch (err) {
        console.error(`Error processing nomination for user ${nom.user_id}:`, err);
        return {
          ...nom,
          profile_name: "Unknown",
          banned: false,
          ban_reason: null,
        };
      }
    })
  );

  // Extract values from allSettled results
  const results = enriched.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.error("Failed to enrich nomination:", result.reason);
    return null;
  }).filter((nom): nom is NonNullable<typeof nom> => nom !== null);

  return NextResponse.json(results);
}
