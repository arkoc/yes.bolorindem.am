import { createServerClient } from "@/lib/supabase/server";
import { PM_NOMINATION_DEADLINE } from "@/lib/elections-config";
import { NextResponse } from "next/server";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if user is banned
  const { data: profile } = await supabase
    .from("profiles")
    .select("banned")
    .eq("id", user.id)
    .single();

  if (profile?.banned) {
    return NextResponse.json({ error: "Դուք արգելափակվել եք" }, { status: 403 });
  }

  // Check deadline
  if (new Date() >= PM_NOMINATION_DEADLINE) {
    return NextResponse.json({ error: "deadline_passed" }, { status: 403 });
  }

  const { nominee_name } = await req.json();

  // Validate nominee_name: non-empty, 2+ words
  const trimmedName = nominee_name?.trim() || "";
  const words = trimmedName.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return NextResponse.json(
      { error: "Անունը պետք է պարունակի առաջին և ազգանուն (մինիմում 2 բառ)" },
      { status: 400 }
    );
  }

  // Normalize to title case for case-insensitive matching
  const normalizedName = toTitleCase(trimmedName);

  // Upsert nomination (nominator_email will be NULL since voter registered separately)
  const { error } = await supabase.from("pm_nominations").upsert(
    {
      user_id: user.id,
      nominee_name: normalizedName,
      nominator_email: null,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Error upserting nomination:", error);
    return NextResponse.json(
      { error: "Failed to save nomination" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check deadline
  if (new Date() >= PM_NOMINATION_DEADLINE) {
    return NextResponse.json({ error: "deadline_passed" }, { status: 403 });
  }

  const { error } = await supabase
    .from("pm_nominations")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting nomination:", error);
    return NextResponse.json(
      { error: "Failed to delete nomination" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
