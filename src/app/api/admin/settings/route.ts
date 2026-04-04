import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("admin_settings")
    .select("key, value, updated_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = (data ?? []).map((row) => ({
    key: row.key,
    value: Number(row.value),
    updated_at: row.updated_at ?? null,
  }));

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: Array<{ key: string; value: number }>;
  try {
    body = await request.json();
    if (!Array.isArray(body)) {
      throw new Error("Expected array");
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body — expected array of {key, value}" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const errors: string[] = [];
  for (const item of body) {
    if (typeof item.key !== "string" || typeof item.value !== "number") {
      errors.push(`Invalid item: ${JSON.stringify(item)}`);
      continue;
    }

    const { error } = await admin
      .from("admin_settings")
      .update({ value: String(item.value) })
      .eq("key", item.key);

    if (error) {
      errors.push(`Failed to update ${item.key}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
