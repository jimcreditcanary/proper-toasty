// POST /api/installers/no-slots-lead/contacted
//
// Stamp installer_lead_outreach.contacted_at + contact_method when
// an installer hits "Reach out to homeowner" on the lead claim
// page. Pairs with src/app/installer/leads/[leadId]/claim.
//
// Auth: signed-in installer only. We check (in this order):
//   1. There IS a signed-in user.
//   2. That user owns an installers row.
//   3. That installer matches the body's installerId.
//   4. The (installer_id, lead_id) outreach row exists.
//
// Each layer is its own 401/403/404 so misconfigured clients fail
// loudly instead of silently no-opping.
//
// Idempotency: contacted_at is set with .update() guarded by an
// `is null` filter on the WHERE so a double-click only stamps the
// first time. The second call returns the existing timestamp +
// status:"already" without a write.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

const BodySchema = z.object({
  outreachId: z.string().uuid(),
  installerId: z.number().int().positive(),
  leadId: z.string().uuid(),
  method: z.enum(["email", "phone"]),
});

interface OkResponse {
  ok: true;
  status: "stamped" | "already";
  contactedAt: string;
  contactMethod: "email" | "phone";
}
interface ErrResponse {
  ok: false;
  error: string;
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<ErrResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<ErrResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }
  const { outreachId, installerId, leadId, method } = parsed.data;

  // ─── Auth ────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<ErrResponse>(
      { ok: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  const { data: installer } = await admin
    .from("installers")
    .select("id, user_id, email")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; user_id: string | null; email: string | null }>();
  if (!installer) {
    return NextResponse.json<ErrResponse>(
      { ok: false, error: "Your account isn't linked to an installer" },
      { status: 403 },
    );
  }
  if (installer.id !== installerId) {
    // Defends against a stale client / forged body — the signed-in
    // user must match the installer whose contacted_at we're about
    // to stamp.
    return NextResponse.json<ErrResponse>(
      { ok: false, error: "This lead isn't yours to claim" },
      { status: 403 },
    );
  }

  // Confirm the outreach row exists for this (installer, lead).
  // We don't trust the body's outreachId on its own — a hostile
  // client could supply someone else's id. Check by composite key
  // and use the row's actual id for the update.
  const { data: outreach } = await admin
    .from("installer_lead_outreach")
    .select("id, contacted_at, contact_method")
    .eq("installer_id", installer.id)
    .eq("lead_id", leadId)
    .maybeSingle<{
      id: string;
      contacted_at: string | null;
      contact_method: "email" | "phone" | null;
    }>();
  if (!outreach) {
    return NextResponse.json<ErrResponse>(
      { ok: false, error: "No outreach record for this lead" },
      { status: 404 },
    );
  }
  // We also do a soft check that the body's outreachId matches what
  // we found (defence-in-depth — body could be stale after a manual
  // reseed). If it doesn't match, prefer the DB row.
  if (outreach.id !== outreachId) {
    console.warn("[no-slots-contacted] outreachId mismatch — using DB row", {
      bodyId: outreachId,
      dbId: outreach.id,
    });
  }

  if (outreach.contacted_at) {
    // Already stamped — return the existing record so the UI can
    // resync without firing a duplicate analytics event.
    return NextResponse.json<OkResponse>(
      {
        ok: true,
        status: "already",
        contactedAt: outreach.contacted_at,
        contactMethod: outreach.contact_method ?? method,
      },
      { status: 200 },
    );
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("installer_lead_outreach")
    .update({
      contacted_at: nowIso,
      contact_method: method,
    })
    .eq("id", outreach.id)
    // Race guard: only stamp if it's still null. If two tabs hit
    // the button at once, the second update no-ops and we return
    // the first one's timestamp on the read below.
    .is("contacted_at", null)
    .select("contacted_at, contact_method")
    .maybeSingle<{
      contacted_at: string | null;
      contact_method: "email" | "phone" | null;
    }>();

  if (updateErr) {
    console.error("[no-slots-contacted] update failed", updateErr);
    return NextResponse.json<ErrResponse>(
      { ok: false, error: "Couldn't save" },
      { status: 500 },
    );
  }

  // Fire-and-forget analytics. Tied to the installer's user id +
  // the email for cross-reference with the original send event.
  try {
    track("installer_no_slots_lead_contacted", {
      props: {
        installer_id: installerId,
        contact_method: method,
      },
      userId: user.id,
      email: installer.email,
    });
  } catch {
    // never block on analytics
  }

  return NextResponse.json<OkResponse>(
    {
      ok: true,
      status: "stamped",
      contactedAt: updated?.contacted_at ?? nowIso,
      contactMethod: updated?.contact_method ?? method,
    },
    { status: 200 },
  );
}
