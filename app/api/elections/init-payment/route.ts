import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";
import { initPayment } from "@/lib/ameria";

function hashDocument(docNumber: string) {
  const salt = process.env.DOC_NUMBER_SALT ?? "default-salt";
  return createHash("sha256").update(salt + docNumber.trim().toUpperCase()).digest("hex");
}

function generateOrderId(): number {
  // 8-digit integer: last 5 digits of timestamp + 3 random digits
  const ts = Date.now() % 100000;
  const rand = Math.floor(Math.random() * 1000);
  return ts * 1000 + rand;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const orderId = generateOrderId();

  const adminClient = createAdminClient();

  // Insert registration with pending payment status
  const { data: reg, error: insertError } = await adminClient
    .from("election_registrations")
    .insert({
      type,
      full_name: full_name.trim(),
      document_number_hash,
      phone: phone.trim(),
      payment_amount,
      payment_status: "pending",
      ameria_order_id: orderId,
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

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }

  // Initialize payment with AmeriBank
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const backUrl = `${origin}/api/elections/payment-callback`;
  const description = type === "voter"
    ? "Ընտրողի գրանցում — Բոլոր Ինդեմ ԱՄ"
    : "Թեկնածուի գրանցում — Բոլոր Ինդեմ ԱՄ";

  try {
    const { paymentId, paymentUrl } = await initPayment({
      orderId,
      amount: payment_amount,
      description,
      backUrl,
    });

    // Store the AmeriBank payment ID
    await adminClient
      .from("election_registrations")
      .update({ ameria_payment_id: paymentId })
      .eq("id", reg.id);

    return NextResponse.json({ paymentUrl });
  } catch (err) {
    // Delete the registration since payment init failed
    await adminClient.from("election_registrations").delete().eq("id", reg.id);
    console.error("AmeriBank InitPayment error:", err);
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 502 });
  }
}
