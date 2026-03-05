import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().refine((n) => n !== 0, "Amount cannot be zero"),
  description: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Authenticate the caller
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is admin or leader
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["admin", "leader"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { userId, amount, description } = parsed.data;

  // Use service role to bypass RLS for privileged operations
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("total_points")
    .eq("id", userId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Record the transaction
  const { error: txError } = await admin.from("point_transactions").insert({
    user_id: userId,
    amount,
    source_type: "admin_grant",
    description,
    created_by: user.id,
  });

  if (txError) {
    console.error("point_transactions insert error:", txError);
    return NextResponse.json({ error: "Failed to record transaction." }, { status: 500 });
  }

  // Update the volunteer's total (cannot go below 0)
  const { error: updateError } = await admin
    .from("profiles")
    .update({ total_points: Math.max(0, target.total_points + amount) })
    .eq("id", userId);

  if (updateError) {
    console.error("profiles update error:", updateError);
    return NextResponse.json({ error: "Failed to update points." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
