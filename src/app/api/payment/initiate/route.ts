import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initiatePayment } from "@/lib/obconnect";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const body = await request.json();

    const {
      verificationId,
      amount,
      payeeName,
      sortCode,
      accountNumber,
      reference,
    } = body;

    if (!amount || !payeeName || !sortCode || !accountNumber || !reference) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    // Check credits
    const { data: profile } = await admin
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits < 1) {
      return NextResponse.json(
        { error: "INSUFFICIENT_CREDITS" },
        { status: 400 }
      );
    }

    // Deduct credit
    const { data: hasCredit } = await admin.rpc("deduct_credit", {
      p_user_id: user.id,
    });

    if (!hasCredit) {
      return NextResponse.json(
        { error: "INSUFFICIENT_CREDITS" },
        { status: 400 }
      );
    }

    // Initiate payment via OBConnect
    let result;
    try {
      result = await initiatePayment({
        amount: Number(amount),
        currency: "GBP",
        payeeName,
        sortCode,
        accountNumber,
        reference,
      });
    } catch (err) {
      // Refund the credit on OBConnect failure
      console.error("OBConnect initiation failed, refunding credit:", err);
      await admin
        .from("users")
        .update({ credits: (profile.credits) })
        .eq("id", user.id);
      return NextResponse.json(
        { error: "Payment initiation failed. Your credit has been refunded." },
        { status: 502 }
      );
    }

    // Store payment record
    const { data: payment, error: insertError } = await admin
      .from("ob_payments")
      .insert({
        user_id: user.id,
        verification_id: verificationId || null,
        obconnect_payment_id: result.paymentId,
        amount: Number(amount),
        currency: "GBP",
        payee_name: payeeName,
        sort_code: sortCode,
        account_number: accountNumber,
        reference,
        status: "PENDING",
        auth_url: result.authUrl,
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      console.error("Failed to store payment record:", insertError);
      return NextResponse.json(
        { error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentId: payment.id,
      authUrl: result.authUrl,
    });
  } catch (error) {
    console.error("Payment initiate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
