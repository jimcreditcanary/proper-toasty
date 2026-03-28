import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentStatus } from "@/lib/obconnect";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const status = searchParams.get("status");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    if (!paymentId) {
      return NextResponse.redirect(`${appUrl}/dashboard`);
    }

    const admin = createAdminClient();

    // Find the payment record by obconnect_payment_id
    const { data: payment } = await admin
      .from("ob_payments")
      .select("id")
      .eq("obconnect_payment_id", paymentId)
      .single();

    if (!payment) {
      console.error("Payment not found for OBConnect ID:", paymentId);
      return NextResponse.redirect(`${appUrl}/dashboard`);
    }

    // Verify status with OBConnect (or trust callback in mock mode)
    let verifiedStatus: string;
    let reason: string | undefined;

    try {
      const result = await getPaymentStatus(paymentId, status ?? undefined);
      verifiedStatus = result.status;
      reason = result.reason;
    } catch {
      verifiedStatus = "FAILED";
      reason = "Unable to verify payment status";
    }

    // Update payment record
    const updateData: Record<string, unknown> = {
      status: verifiedStatus,
    };

    if (reason) {
      updateData.reason = reason;
    }

    if (verifiedStatus === "COMPLETED" || verifiedStatus === "AUTHORISED") {
      updateData.completed_at = new Date().toISOString();
    }

    await admin
      .from("ob_payments")
      .update(updateData)
      .eq("id", payment.id);

    return NextResponse.redirect(
      `${appUrl}/payment/result?id=${payment.id}`
    );
  } catch (error) {
    console.error("Payment callback error:", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }
}
