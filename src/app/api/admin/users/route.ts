import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401, userId: null };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Forbidden", status: 403, userId: null };
  }

  return { error: null, status: 200, userId: user.id };
}

export async function PATCH(request: NextRequest) {
  const { error, status, userId } = await verifyAdmin();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await request.json();
  const { userId: targetUserId, role, blocked } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (role !== undefined) {
    // Prevent admin from removing their own admin role
    if (targetUserId === userId && role !== "admin") {
      return NextResponse.json(
        { error: "Cannot remove your own admin role" },
        { status: 400 }
      );
    }
    updates.role = role;
  }

  if (blocked !== undefined) {
    // Prevent admin from blocking themselves
    if (targetUserId === userId && blocked) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );
    }
    updates.blocked = blocked;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("users")
    .update(updates)
    .eq("id", targetUserId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { error, status, userId } = await verifyAdmin();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await request.json();
  const { userId: targetUserId } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Prevent admin from deleting themselves
  if (targetUserId === userId) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Delete user's data first (verifications, scans, etc.)
  await admin.from("verifications").delete().eq("user_id", targetUserId);
  await admin.from("scans").delete().eq("user_id", targetUserId);
  await admin.from("api_logs").delete().eq("user_id", targetUserId);
  await admin.from("payments").delete().eq("user_id", targetUserId);
  await admin.from("ob_payments").delete().eq("user_id", targetUserId);

  // Delete the user record
  const { error: deleteError } = await admin
    .from("users")
    .delete()
    .eq("id", targetUserId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  // Also delete from Supabase Auth
  const { error: authDeleteError } =
    await admin.auth.admin.deleteUser(targetUserId);

  if (authDeleteError) {
    // User record is already deleted, log but don't fail
    console.error("Failed to delete auth user:", authDeleteError.message);
  }

  return NextResponse.json({ success: true });
}
