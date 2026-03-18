import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Called by Vercel Cron once per hour (see vercel.json).
// Closes expired bounties (refunds escrow) and archives expired projects.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const [{ data: bounties, error: e1 }, { data: projects, error: e2 }] = await Promise.all([
    admin.rpc("expire_bounties"),
    admin.rpc("expire_projects"),
  ]);

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, expiredBounties: bounties, archivedProjects: projects });
}
