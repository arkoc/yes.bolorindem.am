import { redirect, notFound } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { BountyDetail } from "@/components/volunteer/BountyDetail";

export const dynamic = "force-dynamic";

export default async function BountyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: bounty } = await admin
    .from("user_bounties")
    .select(`
      id, title, description, proof_hint, reward_points,
      is_repeatable, max_completions, require_photo, status,
      created_at, expires_at, creator_id,
      creator:profiles!user_bounties_creator_id_fkey(full_name),
      completions:bounty_completions(
        id, user_id, proof_url, status, created_at, resolved_at, resolution,
        completer:profiles!bounty_completions_user_id_fkey(full_name)
      )
    `)
    .eq("id", id)
    .single();

  if (!bounty) notFound();

  return (
    <BountyDetail
      bounty={bounty as unknown as Parameters<typeof BountyDetail>[0]["bounty"]}
      currentUserId={user.id}
    />
  );
}
