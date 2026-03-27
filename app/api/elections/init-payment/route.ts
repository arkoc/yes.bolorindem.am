import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";

function hashDocument(docNumber: string) {
  const salt = process.env.DOC_NUMBER_SALT ?? "default-salt";
  return createHash("sha256").update(salt + docNumber.trim().toUpperCase()).digest("hex");
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    type,
    full_name,
    patronymic,
    document_number,
    passport_number,
    phone,
    acceptance_movement,
    acceptance_citizenship,
    acceptance_self_restriction,
    acceptance_age_25,
    acceptance_only_armenian,
    acceptance_lived_in_armenia,
    acceptance_voting_right,
    acceptance_armenian_language,
  } = body;

  if (!type || !full_name || !document_number || !phone || !acceptance_movement) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (type !== "voter" && type !== "candidate") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (type === "voter" && !acceptance_citizenship) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (type === "candidate" && (
    !acceptance_self_restriction || !acceptance_age_25 ||
    !acceptance_only_armenian || !acceptance_lived_in_armenia ||
    !acceptance_voting_right || !acceptance_armenian_language
  )) {
    return NextResponse.json({ error: "Missing candidate acceptances" }, { status: 400 });
  }

  const document_number_hash = hashDocument(document_number);
  const payment_amount = type === "voter" ? VOTER_FEE : CANDIDATE_FEE;

  const adminClient = createAdminClient();

  const { error: insertError } = await adminClient
    .from("election_registrations")
    .insert({
      user_id: user.id,
      type,
      full_name: full_name.trim(),
      patronymic: patronymic?.trim() ?? null,
      passport_number: passport_number?.trim() ?? null,
      document_number_hash,
      phone: phone.trim(),
      payment_amount,
      payment_status: "pending",
      acceptance_movement,
      acceptance_citizenship,
      acceptance_self_restriction: type === "candidate" ? acceptance_self_restriction : null,
      acceptance_age_25: type === "candidate" ? acceptance_age_25 : null,
      acceptance_only_armenian: type === "candidate" ? acceptance_only_armenian : null,
      acceptance_lived_in_armenia: type === "candidate" ? acceptance_lived_in_armenia : null,
      acceptance_voting_right: type === "candidate" ? acceptance_voting_right : null,
      acceptance_armenian_language: type === "candidate" ? acceptance_armenian_language : null,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("election insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
