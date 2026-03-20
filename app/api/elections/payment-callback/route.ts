import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPaymentDetails, isPaymentSuccessful } from "@/lib/ameria";

// AmeriBank redirects here after payment:
// GET /api/elections/payment-callback?paymentID=...&orderID=...&responseCode=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentID = searchParams.get("paymentID") ?? searchParams.get("id");
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  if (!paymentID) {
    return NextResponse.redirect(`${origin}/elections/payment?error=missing_payment_id`);
  }

  try {
    const details = await getPaymentDetails(paymentID);

    if (!isPaymentSuccessful(details)) {
      return NextResponse.redirect(
        `${origin}/elections/payment?error=payment_failed&state=${details.paymentState}`
      );
    }

    // Mark registration as paid
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("election_registrations")
      .update({ payment_status: "paid" })
      .eq("ameria_payment_id", paymentID)
      .eq("payment_status", "pending"); // idempotent guard

    if (error) {
      console.error("Failed to mark registration as paid:", error);
      // Still show success — payment went through, we'll reconcile manually if needed
    }

    return NextResponse.redirect(`${origin}/elections/payment?success=1`);
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(`${origin}/elections/payment?error=verification_failed`);
  }
}
