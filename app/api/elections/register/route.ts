import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    type,
    full_name,
    document_number,
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
  if (type === "voter" && !acceptance_citizenship) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (type === "candidate" && (
    !acceptance_self_restriction || !acceptance_age_25 ||
    !acceptance_only_armenian || !acceptance_lived_in_armenia ||
    !acceptance_voting_right || !acceptance_armenian_language
  )) {
    return NextResponse.json({ error: "Missing candidate fields" }, { status: 400 });
  }

  const payment_amount = type === "voter" ? VOTER_FEE : CANDIDATE_FEE;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("election_registrations")
    .insert({
      type,
      full_name: full_name.trim(),
      document_number: document_number.trim(),
      phone: phone.trim(),
      payment_amount,
      acceptance_movement,
      acceptance_citizenship,
      acceptance_self_restriction: type === "candidate" ? acceptance_self_restriction : null,
      acceptance_age_25: type === "candidate" ? acceptance_age_25 : null,
      acceptance_only_armenian: type === "candidate" ? acceptance_only_armenian : null,
      acceptance_lived_in_armenia: type === "candidate" ? acceptance_lived_in_armenia : null,
      acceptance_voting_right: type === "candidate" ? acceptance_voting_right : null,
      acceptance_armenian_language: type === "candidate" ? acceptance_armenian_language : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
