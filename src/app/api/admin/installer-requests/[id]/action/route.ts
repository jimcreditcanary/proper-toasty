import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminRequestActionSchema,
  type AdminRequestActionResponse,
} from "@/lib/schemas/installer-signup-request";
import { sendEmail } from "@/lib/email/client";
import { buildRequestApprovedEmail } from "@/lib/email/templates/installer-request-approved";
import { buildRequestRejectedEmail } from "@/lib/email/templates/installer-request-rejected";
import type { Database } from "@/types/database";

// POST /api/admin/installer-requests/[id]/action
//
// Body: { action: 'approve'|'reject', adminNotes?: string, override?: {...} }
//
// Admin-only. Approve creates a new public.installers row and emails
// the requester a claim link via /installer-signup?id=<new_id>.
// Reject just flips the request status to 'rejected' and emails the
// requester the reason.
//
// Idempotency: if the request is already approved/rejected, we
// return ok=true with no side-effects. The button stays out of the
// UI for non-pending requests anyway, but defending against double-
// clicks is cheap.

export const runtime = "nodejs";
export const maxDuration = 30;

// Manual installer rows live above this id to stay clear of the MCS
// scrape range (largest observed MCS id is well under 1M).
const MANUAL_INSTALLER_ID_BASE = 10_000_000;

type RequestRow = Database["public"]["Tables"]["installer_signup_requests"]["Row"];

async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required" };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role, blocked")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null; blocked: boolean }>();
  if (profile?.blocked) {
    return { ok: false, status: 403, error: "Account blocked" };
  }
  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Admins only" };
  }
  return { ok: true, userId: user.id };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (!id) {
    return NextResponse.json<AdminRequestActionResponse>(
      { ok: false, error: "Missing request id" },
      { status: 400 },
    );
  }

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json<AdminRequestActionResponse>(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AdminRequestActionResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = AdminRequestActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<AdminRequestActionResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Load the request row. Use service role so RLS can't trip us up.
  const { data: reqRow, error: reqErr } = await admin
    .from("installer_signup_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle<RequestRow>();
  if (reqErr || !reqRow) {
    return NextResponse.json<AdminRequestActionResponse>(
      { ok: false, error: "Request not found" },
      { status: 404 },
    );
  }

  // Idempotent re-action — return ok with no side-effects.
  if (reqRow.status !== "pending") {
    console.log("[admin/installer-requests/action] already actioned", {
      id,
      status: reqRow.status,
    });
    return NextResponse.json<AdminRequestActionResponse>({
      ok: true,
      installerId: reqRow.approved_installer_id ?? undefined,
    });
  }

  if (parsed.data.action === "reject") {
    return handleReject({
      admin,
      reqRow,
      reviewerId: auth.userId,
      adminNotes: parsed.data.adminNotes ?? null,
    });
  }

  return handleApprove({
    admin,
    reqRow,
    reviewerId: auth.userId,
    adminNotes: parsed.data.adminNotes ?? null,
    override: parsed.data.override,
  });
}

// ─── Reject ─────────────────────────────────────────────────────────

async function handleReject({
  admin,
  reqRow,
  reviewerId,
  adminNotes,
}: {
  admin: ReturnType<typeof createAdminClient>;
  reqRow: RequestRow;
  reviewerId: string;
  adminNotes: string | null;
}): Promise<NextResponse> {
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("installer_signup_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: now,
      admin_notes: adminNotes,
    })
    .eq("id", reqRow.id);
  if (updateErr) {
    console.error("[admin/installer-requests/action] reject update failed", updateErr);
    return NextResponse.json<AdminRequestActionResponse>(
      { ok: false, error: "Couldn't update request" },
      { status: 500 },
    );
  }

  // Email the requester. Soft-fail.
  try {
    const email = buildRequestRejectedEmail({
      contactName: reqRow.contact_name,
      companyName: reqRow.company_name,
      adminNote: adminNotes,
    });
    const result = await sendEmail({
      to: reqRow.contact_email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "kind", value: "installer_request_rejected" },
        { name: "request_id", value: reqRow.id },
      ],
    });
    console.log("[admin/installer-requests/action] reject email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[admin/installer-requests/action] reject email failed",
      e instanceof Error ? e.message : e,
    );
  }

  return NextResponse.json<AdminRequestActionResponse>({ ok: true });
}

// ─── Approve ────────────────────────────────────────────────────────

async function handleApprove({
  admin,
  reqRow,
  reviewerId,
  adminNotes,
  override,
}: {
  admin: ReturnType<typeof createAdminClient>;
  reqRow: RequestRow;
  reviewerId: string;
  adminNotes: string | null;
  override:
    | {
        companyName?: string;
        contactEmail?: string;
        certificationBody?: string | null;
        certificationNumber?: string | null;
        capHeatPump?: boolean;
        capSolarPv?: boolean;
        capBatteryStorage?: boolean;
        busRegistered?: boolean;
      }
    | undefined;
}): Promise<NextResponse> {
  // Pick a fresh installer id above MANUAL_INSTALLER_ID_BASE. We
  // increment from max(existing) to avoid collisions even if two
  // approvals land in quick succession (the unique PK takes care of
  // any actual race).
  const newId = await pickNextManualInstallerId(admin);

  const companyName = override?.companyName ?? reqRow.company_name;
  const contactEmail = override?.contactEmail ?? reqRow.contact_email;
  const certBody = override?.certificationBody ?? reqRow.certification_body;
  const certNumber =
    override?.certificationNumber ??
    (reqRow.certification_pending ? "PENDING" : reqRow.certification_number);
  const capHp = override?.capHeatPump ?? reqRow.cap_heat_pump;
  const capPv = override?.capSolarPv ?? reqRow.cap_solar_pv;
  const capBat = override?.capBatteryStorage ?? reqRow.cap_battery_storage;
  const bus = override?.busRegistered ?? reqRow.bus_registered;

  // Insert the installer row. Most fields default sensibly per the
  // table definition; we set the ones that come from the request.
  const { error: insertErr } = await admin.from("installers").insert({
    id: newId,
    certification_body: certBody ?? "MCS",
    certification_number: certNumber ?? "PENDING",
    company_name: companyName,
    email: contactEmail,
    telephone: reqRow.contact_phone,
    bus_registered: bus,
    cap_air_source_heat_pump: capHp,
    cap_ground_source_heat_pump: capHp,
    cap_solar_pv: capPv,
    cap_battery_storage: capBat,
    company_number: reqRow.company_number,
    incorporation_date: reqRow.ch_incorporation_date,
    source: "admin_approved",
    // Address: we only have the CH free-text line. Drop it on
    // address_line_1 so the directory tile shows something. Lat/lng
    // stay null for now — admin can geocode later or it'll be done
    // via an enrichment script. Without lat/lng the row won't show
    // up in /api/installers/nearby until then.
    address_line_1: reqRow.ch_address,
  });
  if (insertErr) {
    console.error("[admin/installer-requests/action] installer insert failed", insertErr);
    return NextResponse.json<AdminRequestActionResponse>(
      { ok: false, error: `Couldn't create installer: ${insertErr.message}` },
      { status: 500 },
    );
  }

  // Mark the request approved.
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("installer_signup_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: now,
      admin_notes: adminNotes,
      approved_installer_id: newId,
    })
    .eq("id", reqRow.id);
  if (updateErr) {
    console.error(
      "[admin/installer-requests/action] approve status update failed",
      updateErr,
    );
    // Don't unwind the installer row — admin can re-run if needed.
  }

  // Email the requester with the F2 claim link.
  const claimUrl = `${normalisedBase()}/installer-signup?id=${newId}`;
  try {
    const email = buildRequestApprovedEmail({
      contactName: reqRow.contact_name,
      companyName,
      claimUrl,
      adminNote: adminNotes,
    });
    const result = await sendEmail({
      to: contactEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "kind", value: "installer_request_approved" },
        { name: "request_id", value: reqRow.id },
        { name: "installer_id", value: String(newId) },
      ],
    });
    console.log("[admin/installer-requests/action] approve email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[admin/installer-requests/action] approve email failed",
      e instanceof Error ? e.message : e,
    );
  }

  return NextResponse.json<AdminRequestActionResponse>({
    ok: true,
    installerId: newId,
  });
}

async function pickNextManualInstallerId(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { data } = await admin
    .from("installers")
    .select("id")
    .gte("id", MANUAL_INSTALLER_ID_BASE)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: number }>();
  if (data?.id) return data.id + 1;
  return MANUAL_INSTALLER_ID_BASE;
}

function normalisedBase(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://propertoasty.com";
  const url = base.startsWith("http") ? base : `https://${base}`;
  return url.replace(/\/+$/, "");
}
