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

    const result = await runVerification({ formData, userId, admin });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("Verify-full error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
