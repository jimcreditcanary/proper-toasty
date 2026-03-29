import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runVerification } from "@/lib/run-verification";

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();

    // No auth check — this is for unauthenticated lead users
    // No credit deduction — free check

    const formData = await request.formData();
    const result = await runVerification({ formData, userId: null, admin });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("Verify-lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
