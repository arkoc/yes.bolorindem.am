import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const title        = (formData.get("title") as string)?.trim();
  const description  = (formData.get("description") as string)?.trim();
  const proofHint    = (formData.get("proofHint") as string)?.trim() || null;
  const rewardPoints = Number(formData.get("rewardPoints"));
  const isRepeatable = formData.get("isRepeatable") === "true";
  const maxCompletionsRaw = Number(formData.get("maxCompletions"));
  const maxCompletions = isRepeatable && maxCompletionsRaw >= 2 ? maxCompletionsRaw : null;
  const expiresAt    = (formData.get("expiresAt") as string) || null;
  const requirePhoto = formData.get("requirePhoto") !== "false";
  const imageFiles = (formData.getAll("images") as File[]).filter(f => f.size > 0);

  if (!title || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (isNaN(rewardPoints) || rewardPoints < 10) {
    return NextResponse.json({ error: "Minimum reward is 10 points" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upload all images in parallel
  const imageUrls: string[] = [];
  if (imageFiles.length > 0) {
    try {
      const uploads = await Promise.all(
        imageFiles.map(async (file, i) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `bounty-images/${user.id}/${Date.now()}_${i}.${ext}`;
          const { error: uploadError } = await admin.storage
            .from("bounty-proofs")
            .upload(path, file, { upsert: true, contentType: file.type });
          if (uploadError) throw new Error(uploadError.message);
          return admin.storage.from("bounty-proofs").getPublicUrl(path).data.publicUrl;
        })
      );
      imageUrls.push(...uploads);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  // Build RPC params — omit optional array/bool params when defaults apply
  // to avoid PostgREST type-inference errors on empty arrays.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcParams: Record<string, any> = {
    p_creator_id:      user.id,
    p_title:           title,
    p_description:     description,
    p_proof_hint:      proofHint,
    p_reward_points:   rewardPoints,
    p_is_repeatable:   isRepeatable,
    p_max_completions: maxCompletions,
    p_expires_at:      expiresAt || null,
  };
  // Only pass newer params if the migrations have added them (avoids breaking
  // older DB instances). We pass them unconditionally but skip empty arrays.
  rpcParams.p_require_photo = requirePhoto;
  if (imageUrls.length > 0) rpcParams.p_image_urls = imageUrls;

  const { data, error } = await admin.rpc("create_user_bounty", rpcParams);

  if (error) {
    console.error("create_user_bounty error:", error);
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
  }
  if (!data.ok) return NextResponse.json({ error: data.reason }, { status: 422 });

  return NextResponse.json({ id: data.id });
}
