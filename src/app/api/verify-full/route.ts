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

    // Deduct credit
    const { data: hasCredit } = await admin.rpc("deduct_credit", {
      p_user_id: userId,
    });
    if (!hasCredit) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Parse multipart form data and run verification
    const formData = await request.formData();
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
