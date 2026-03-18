import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const files = formData.getAll("images") as File[];
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const admin = createAdminClient();
  const urls: string[] = [];

  for (let i = 0; i < Math.min(files.length, 5); i++) {
    const file = files[i];
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `task-attachments/${user.id}/${Date.now()}_${i}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await admin.storage
      .from("bounty-proofs")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    urls.push(admin.storage.from("bounty-proofs").getPublicUrl(path).data.publicUrl);
  }

  return NextResponse.json({ urls });
}
