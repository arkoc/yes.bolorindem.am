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

  // Single atomic RPC: UPDATE profiles + INSERT point_transaction in one transaction.
  // Eliminates the lost-update race condition from the prior read-then-write pattern.
  const admin = createAdminClient();
  const { data: newPoints, error: rpcError } = await admin.rpc("grant_points_atomic", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_granted_by: user.id,
  });

  if (rpcError) {
    if (rpcError.message?.includes("user_not_found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("grant_points_atomic error:", rpcError);
    return NextResponse.json({ error: "Failed to grant points." }, { status: 500 });
  }

  return NextResponse.json({ success: true, newTotalPoints: newPoints });
}
