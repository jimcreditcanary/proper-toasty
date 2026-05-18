// GET + POST /api/unsubscribe?token=<claim_token>
//
// RFC 8058 one-click unsubscribe + the regular link-click flow.
// Gmail/Yahoo's bulk-sender rules require BOTH a GET (for
// link-click) AND a POST (for the List-Unsubscribe-Post header) to
// honour unsubscribe. Both behave identically — idempotent, no
// auth required (the token IS the auth).
//
// Side effects:
//   - Insert/upsert outreach_suppression row for the email
//   - Flip outreach_recipients.state to 'unsubscribed'
//   - Log to outreach_events
//
// GET redirects to /unsubscribe (the confirmation page).
// POST returns 200 plain text (some clients expect a body, not a
// redirect).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClaimToken } from "@/lib/outreach/claim-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function processUnsubscribe(
  req: Request,
): Promise<{ ok: boolean; email?: string; error?: string }> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return { ok: false, error: "Missing token" };

  const recipientId = verifyClaimToken(token);
  if (!recipientId) return { ok: false, error: "Invalid token" };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select("id, installer_id")
    .eq("id", recipientId)
    .maybeSingle<{ id: string; installer_id: number }>();
  if (!recipient) return { ok: false, error: "Recipient not found" };

  const { data: installer } = await admin
    .from("installers")
    .select("email")
    .eq("id", recipient.installer_id)
    .maybeSingle<{ email: string | null }>();
  const email = installer?.email?.toLowerCase().trim() ?? null;

  if (email) {
    await admin
      .from("outreach_suppression")
      .upsert(
        {
          email,
          reason: "unsubscribed",
          source: "one_click_unsubscribe",
        },
        { onConflict: "email" },
      );
  }

  await admin
    .from("outreach_recipients")
    .update({ state: "unsubscribed", updated_at: now })
    .eq("id", recipient.id);

  await admin.from("outreach_events").insert({
    recipient_id: recipient.id,
    event_type: "subscription_change",
    metadata: { source: "one_click_unsubscribe", email },
  });

  return { ok: true, email: email ?? undefined };
}

export async function GET(req: Request) {
  const result = await processUnsubscribe(req);
  const url = new URL(req.url);
  const target = new URL("/unsubscribe", url.origin);
  if (!result.ok) target.searchParams.set("error", result.error ?? "unknown");
  return NextResponse.redirect(target, 303);
}

export async function POST(req: Request) {
  const result = await processUnsubscribe(req);
  if (!result.ok) {
    return new NextResponse(`Unsubscribe failed: ${result.error}`, {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse("You have been unsubscribed.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
