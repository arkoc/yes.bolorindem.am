import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { avatar_url } = body as { avatar_url?: string };

  if (!avatar_url || typeof avatar_url !== "string") {
    return NextResponse.json({ error: "avatar_url is required" }, { status: 400 });
  }

  // Only allow HTTPS URLs from trusted Supabase storage
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "") ?? "";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(avatar_url);
  } catch {
    return NextResponse.json({ error: "Invalid avatar_url" }, { status: 400 });
  }
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(supabaseHost)) {
    return NextResponse.json({ error: "avatar_url must be a Supabase storage URL" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
