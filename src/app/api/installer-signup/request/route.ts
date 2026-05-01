import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  InstallerSignupRequestSchema,
  type InstallerSignupRequestResponse,
} from "@/lib/schemas/installer-signup-request";
import {
  checkIpRateLimit,
  getRequestIp,
  hashIp,
} from "@/lib/installer-claim/rate-limit";
import { sendEmail } from "@/lib/email/client";
import { buildRequestReceivedEmail } from "@/lib/email/templates/installer-request-received";

// POST /api/installer-signup/request
//
// Captures a new "I can't find my company" submission from
// /installer-signup/request, fires an ack email to the requester,
// and parks the row in the admin review queue. Anonymous endpoint —
// nobody's authenticated yet by definition.
//
// Rate limit: 5 requests per IP per 24h. Failures fall back to
// "allow" so a Postgres hiccup doesn't lock real users out.

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<InstallerSignupRequestResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = InstallerSignupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<InstallerSignupRequestResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const ip = getRequestIp(req);
  const ipHash = hashIp(ip);
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  // ── Rate limit ───────────────────────────────────────────────
  const rate = await checkIpRateLimit(admin, ipHash);
  if (!rate.allowed) {
    console.warn("[installer-signup/request] rate limit hit", {
      ipHash,
      count: rate.count,
    });
    return NextResponse.json<InstallerSignupRequestResponse>(
      {
        ok: false,
        error:
          "We've already had a few requests from your network today. Try again tomorrow, or email hello@propertoasty.com if you're stuck.",
      },
      { status: 429 },
    );
  }

  // ── Insert ───────────────────────────────────────────────────
  const data = parsed.data;
  const { data: inserted, error: insertErr } = await admin
    .from("installer_signup_requests")
    .insert({
      status: "pending",
      company_number: data.companyNumber ?? null,
      company_name: data.companyName,
      ch_address: data.chAddress ?? null,
      ch_incorporation_date: data.chIncorporationDate ?? null,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      bus_registered: data.busRegistered,
      cap_heat_pump: data.capHeatPump,
      cap_solar_pv: data.capSolarPv,
      cap_battery_storage: data.capBatteryStorage,
      certification_body: data.certificationBody ?? null,
      certification_number: data.certificationNumber ?? null,
      certification_pending: data.certificationPending,
      notes: data.notes ?? null,
      request_ip_hash: ipHash,
      request_user_agent: ua,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !inserted) {
    console.error("[installer-signup/request] insert failed", insertErr);
    return NextResponse.json<InstallerSignupRequestResponse>(
      {
        ok: false,
        error: "Couldn't save your request. Try again or email hello@propertoasty.com.",
      },
      { status: 500 },
    );
  }

  console.log("[installer-signup/request] queued", {
    id: inserted.id,
    company: data.companyName,
    email: data.contactEmail,
  });

  // ── Ack email ────────────────────────────────────────────────
  // Fire-and-forget — failure here doesn't block the request from
  // landing in the queue. Worst case the requester checks back.
  try {
    const email = buildRequestReceivedEmail({
      contactName: data.contactName,
      companyName: data.companyName,
    });
    const result = await sendEmail({
      to: data.contactEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "kind", value: "installer_request_received" },
        { name: "request_id", value: inserted.id },
      ],
    });
    console.log("[installer-signup/request] ack email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[installer-signup/request] ack email failed (non-fatal)",
      e instanceof Error ? e.message : e,
    );
  }

  return NextResponse.json<InstallerSignupRequestResponse>({
    ok: true,
    requestId: inserted.id,
  });
}
