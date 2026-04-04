import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runVerification } from "@/lib/run-verification";

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();

    // No auth check — this is for unauthenticated lead users
    // No credit deduction — free check

    const formData = await request.formData();

    // Extract and validate email
    const email = formData.get("email");
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Check if this email has already been used for a free search
    const { data: existingLead } = await admin
      .from("leads")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .limit(1)
      .single();

    if (existingLead) {
      return NextResponse.json(
        {
          error:
            "This email has already been used for a free check. Sign up for an account to run more checks.",
        },
        { status: 403 }
      );
    }

    // Run verification
    const result = await runVerification({ formData, userId: null, admin });

    // Create lead record with email and verification_id
    await admin.from("leads").insert({
      email: email.toLowerCase().trim(),
      verification_id: result.id,
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("Verify-lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
