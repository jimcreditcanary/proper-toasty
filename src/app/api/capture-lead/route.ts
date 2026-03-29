import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, verificationId } = body as {
      email?: string;
      verificationId?: string;
    };

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate verificationId
    if (!verificationId) {
      return NextResponse.json(
        { error: "Missing verificationId" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Validate that the verification exists and has no user_id (i.e. it's a lead verification)
    const { data: verification, error: fetchError } = await admin
      .from("verifications")
      .select("id, user_id")
      .eq("id", verificationId)
      .single();

    if (fetchError || !verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    if (verification.user_id !== null) {
      return NextResponse.json(
        { error: "Verification already associated with a user" },
        { status: 400 }
      );
    }

    // Check if this email has already used a free check
    const { data: existingLeads } = await admin
      .from("leads")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .limit(1);

    if (existingLeads && existingLeads.length > 0) {
      return NextResponse.json(
        { error: "ALREADY_USED", message: "This email has already been used for a free check." },
        { status: 409 }
      );
    }

    // Insert lead record
    const { error: insertError } = await admin.from("leads").insert({
      email: email.toLowerCase().trim(),
      verification_id: verificationId,
    });

    if (insertError) {
      console.error("Failed to insert lead:", insertError);
      return NextResponse.json(
        { error: "Failed to capture lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Capture-lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
