import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

// GET: Retrieve current API key
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("api_key")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    api_key: profile?.api_key ?? null,
  });
}

// POST: Generate or regenerate API key
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Generate a new API key: wap_<32 random hex chars>
  const apiKey = `wap_${randomBytes(24).toString("hex")}`;

  const { error } = await admin
    .from("users")
    .update({ api_key: apiKey })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to generate API key:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    );
  }

  return NextResponse.json({ api_key: apiKey });
}
