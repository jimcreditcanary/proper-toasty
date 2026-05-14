// /api/installer/profile/sponsored — activate / cancel sponsored
// placement.
//
// POST   — body { days: 7 | 30 }. Sets sponsored_until = now() +
//          days. Idempotent in the sense that calling again extends
//          from the LATER of (now, current sponsored_until) so an
//          installer who clicks "30 days" twice gets 60 days total,
//          not a reset back to 30.
// DELETE — clears sponsored_until immediately. No refunds — there's
//          no upfront fee; cost is only the per-lead 10-credit
//          accept charge, which only debited if accepts actually
//          happened.
//
// No payment processing here. The economic deal is "double-cost per
// lead in exchange for top-of-list placement", debited at lead
// acceptance time inside /api/installer-leads/acknowledge.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_DAYS = new Set([7, 30]);

interface InstallerRow {
  id: number;
  user_id: string | null;
  sponsored_until: string | null;
}

async function loadInstallerForCaller(): Promise<
  | { ok: true; installer: InstallerRow; userId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in" };

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, user_id, sponsored_until")
    .eq("user_id", user.id)
    .maybeSingle<InstallerRow>();
  if (!installer) {
    return {
      ok: false,
      status: 403,
      error: "Account not bound to an installer profile",
    };
  }
  return { ok: true, installer, userId: user.id };
}

export async function POST(req: Request) {
  const ctx = await loadInstallerForCaller();
  if (!ctx.ok) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status },
    );
  }

  let days: number | null = null;
  try {
    const json = (await req.json()) as { days?: unknown };
    if (typeof json.days === "number") days = json.days;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be JSON { days: 7 | 30 }" },
      { status: 400 },
    );
  }
  if (days === null || !ALLOWED_DAYS.has(days)) {
    return NextResponse.json(
      { ok: false, error: "days must be 7 or 30" },
      { status: 400 },
    );
  }

  // Extend from the later of (now, current sponsored_until) so
  // back-to-back clicks don't shorten the window.
  const nowMs = Date.now();
  const currentMs = ctx.installer.sponsored_until
    ? new Date(ctx.installer.sponsored_until).getTime()
    : 0;
  const baseMs = Math.max(nowMs, currentMs);
  const sponsoredUntil = new Date(
    baseMs + days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const admin = createAdminClient();
  const { error } = await admin
    .from("installers")
    .update({ sponsored_until: sponsoredUntil })
    .eq("id", ctx.installer.id);
  if (error) {
    console.error("[profile/sponsored] update failed", error);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, sponsoredUntil });
}

export async function DELETE() {
  const ctx = await loadInstallerForCaller();
  if (!ctx.ok) {
    return NextResponse.json(
      { ok: false, error: ctx.error },
      { status: ctx.status },
    );
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("installers")
    .update({ sponsored_until: null })
    .eq("id", ctx.installer.id);
  if (error) {
    console.error("[profile/sponsored] clear failed", error);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
