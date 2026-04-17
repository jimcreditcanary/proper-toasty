import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runVerification } from "@/lib/run-verification";

export async function POST(request: NextRequest) {
  try {
    // Session auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const admin = createAdminClient();

    // Parse multipart form data first so we can tell how many credits
    // the selected tier costs before deducting.
    const formData = await request.formData();
    const creditsRaw = formData.get("creditsToUse");
    const parsed = parseInt((creditsRaw as string) ?? "1", 10);
    const creditsToUse = [1, 2, 3].includes(parsed) ? parsed : 1;

    const { data: hasCredits } = await admin.rpc("deduct_credits", {
      p_user_id: userId,
      p_count: creditsToUse,
    });
    if (!hasCredits) {
      return NextResponse.json(
        { error: `Insufficient credits — this report costs ${creditsToUse}` },
        { status: 402 }
      );
    }

    // Credits are debited — if anything downstream fails we put them
    // back so the user isn't charged for a broken run.
    try {
      const result = await runVerification({ formData, userId, admin });
      return NextResponse.json({ id: result.id });
    } catch (err) {
      console.error(
        `Verify-full failed after deducting ${creditsToUse} credit(s) for user ${userId}, refunding:`,
        err
      );
      try {
        const { data: userRow } = await admin
          .from("users")
          .select("credits")
          .eq("id", userId)
          .single();
        const currentBalance = Number(userRow?.credits ?? 0);
        const { error: refundErr } = await admin
          .from("users")
          .update({
            credits: currentBalance + creditsToUse,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (refundErr) {
          console.error("Credit refund UPDATE failed:", refundErr);
        }
      } catch (refundThrown) {
        console.error("Credit refund error:", refundThrown);
      }
      throw err;
    }
  } catch (error) {
    console.error("Verify-full error:", error);
    return NextResponse.json(
      { error: "Internal server error — no credits were charged" },
      { status: 500 }
    );
  }
}
