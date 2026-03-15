import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bountyId } = await params;
  const admin = createAdminClient();

  const formData = await req.formData();
  const file = formData.get("proof") as File | null;
  if (!file) return NextResponse.json({ error: "No proof uploaded" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${bountyId}/${user.id}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("bounty-proofs")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("bounty-proofs").getPublicUrl(path);

  const { data, error } = await admin.rpc("submit_bounty_completion", {
    p_bounty_id: bountyId,
    p_user_id:   user.id,
    p_proof_url: publicUrl,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.ok) return NextResponse.json({ error: data.reason }, { status: 422 });

  return NextResponse.json({ ok: true, points: data.points });
}
