import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPaymentDetails, isPaymentSuccessful } from "@/lib/ameria";
import { VOTER_POINTS, CANDIDATE_POINTS } from "@/lib/elections-config";

// AmeriBank redirects here after payment:
// GET /api/elections/payment-callback?paymentID=...&orderID=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentID =
    searchParams.get("paymentID") ??
    searchParams.get("paymentId") ??
    searchParams.get("paymentid") ??
    searchParams.get("id");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  if (!paymentID) {
    return NextResponse.redirect(`${appUrl}/elections?payment=error`);
  }

  try {
    const details = await getPaymentDetails(paymentID);

    if (!isPaymentSuccessful(details)) {
      return NextResponse.redirect(`${appUrl}/elections?payment=failed`);
    }

    const adminClient = createAdminClient();

    // Try matching by ameria_payment_id first, fall back to ameria_order_id
    // (order_id fallback handles registrations created before migration 053)
    let reg: { id: string; type: string; user_id: string } | null = null;

    const byPaymentId = await adminClient
      .from("election_registrations")
      .update({ payment_status: "paid", ameria_payment_id: paymentID })
      .eq("ameria_payment_id", paymentID)
      .eq("payment_status", "pending")
      .select("id, type, user_id")
      .maybeSingle();

    if (byPaymentId.data) {
      reg = byPaymentId.data;
    } else {
      // Fallback: match by order_id from AmeriaBank's GetPaymentDetails response
      const orderIdNum = Number(details.orderId);
      if (!isNaN(orderIdNum) && orderIdNum > 0) {
        const byOrderId = await adminClient
          .from("election_registrations")
          .update({ payment_status: "paid", ameria_payment_id: paymentID })
          .eq("ameria_order_id", orderIdNum)
          .eq("payment_status", "pending")
          .select("id, type, user_id")
          .maybeSingle();
        reg = byOrderId.data ?? null;
        if (byOrderId.error) console.error("Fallback order_id match failed:", byOrderId.error);
      }
    }

    if (!reg) {
      console.error("No pending registration found for paymentID:", paymentID, "orderId:", details.orderId);
    }

    // Award points
    if (reg?.user_id) {
      const points = reg.type === "candidate" ? CANDIDATE_POINTS : VOTER_POINTS;
      const source = reg.type === "candidate" ? "candidate_registration" : "voter_registration";
      const description = reg.type === "candidate"
        ? "Candidate registration"
        : "Voter registration";

      try {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("total_points")
          .eq("id", reg.user_id)
          .single();

        await Promise.all([
          adminClient
            .from("profiles")
            .update({ total_points: (profile?.total_points ?? 0) + points })
            .eq("id", reg.user_id),
          adminClient.from("point_transactions").insert({
            user_id: reg.user_id,
            amount: points,
            source_type: source,
            description,
          }),
        ]);
      } catch (err) {
        console.error("Failed to award registration points:", err);
      }
    }

    return NextResponse.redirect(`${appUrl}/elections?payment=success`);
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(`${appUrl}/elections?payment=error`);
  }
}
