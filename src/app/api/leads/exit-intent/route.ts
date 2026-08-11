import { NextResponse, after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import { buildComeBackAndFinishEmail } from "@/lib/email/templates/come-back-and-finish";

// POST /api/leads/exit-intent
//
// Fired by the homepage exit-intent modal when a homeowner submits
// email + postcode after triggering mouse-out (desktop) or the
// mobile fallback (scroll-up + tab-blur).
//
// Behaviour differs from /api/leads/capture (the check-flow lead):
//   - No analysisSnapshot, no analysis-snapshot denorm columns,
//     no checks-row link. The user hasn't run a check yet.
//   - Dedupes by email against homeowner_leads (case-insensitive).
//     An existing check_flow lead is left untouched so we don't
//     downgrade a converted user to source='exit_intent'.
//   - Sends the "come back and finish" invitation email via
//     Postmark, deferred with after() so the response is instant.
//
// Payload:
//   { email, postcode, consentMarketing? }
//
// Response:
//   { ok: true } | { ok: false, error: string }

export const runtime = "nodejs";
export const maxDuration = 10;

const ExitIntentSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  postcode: z
    .string()
    .trim()
    .min(5)
    .max(8)
    .regex(
      /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/,
      "Please enter a full UK postcode.",
    ),
  consentMarketing: z.boolean().optional().default(false),
});

interface Result {
  ok: boolean;
  error?: string;
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<Result>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = ExitIntentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<Result>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const { email: rawEmail, postcode: rawPostcode, consentMarketing } =
    parsed.data;
  const email = rawEmail.trim().toLowerCase();
  const postcode = rawPostcode.trim().toUpperCase();

  const admin = createAdminClient();

  // Dedupe on email. If the person already has a check_flow lead,
  // don't downgrade — they've converted, don't need another nudge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("homeowner_leads")
    .select("id, source")
    .ilike("email", email)
    .maybeSingle();

  if (existing?.source === "check_flow") {
    // Silently succeed — they've already got their report or are
    // mid-flow. No need to email again.
    return NextResponse.json<Result>({ ok: true });
  }

  const payload = {
    email,
    postcode,
    source: "exit_intent" as const,
    user_type: "homeowner" as const,
    consent_marketing: consentMarketing,
    consent_installer_matching: false,
  };

  if (existing?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("homeowner_leads")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      console.error("[leads/exit-intent] update failed", error);
      return NextResponse.json<Result>(
        { ok: false, error: "Could not save" },
        { status: 500 },
      );
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("homeowner_leads")
      .insert(payload);
    if (error) {
      console.error("[leads/exit-intent] insert failed", error);
      return NextResponse.json<Result>(
        { ok: false, error: "Could not save" },
        { status: 500 },
      );
    }
  }

  // Send the "come back and finish" invitation. Deferred via after()
  // so the modal's Submit → success roundtrip is instant, but the
  // request keeps alive until the send completes. Fire-and-forget on
  // Postmark failure — the row is already saved and Jim can re-send
  // manually if needed.
  after(sendComeBackEmail({ email, postcode }));

  return NextResponse.json<Result>({ ok: true });
}

async function sendComeBackEmail(args: {
  email: string;
  postcode: string;
}): Promise<void> {
  try {
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com";
    // Prefill the wizard's postcode via query param — context.tsx
    // reads it into state.prefillPostcode which step-1-address
    // auto-searches on mount.
    const resumeUrl = `${appBaseUrl.replace(/\/+$/, "")}/check?postcode=${encodeURIComponent(args.postcode)}`;
    const { subject, html, text } = buildComeBackAndFinishEmail({
      resumeUrl,
      recipientName: null,
      postcode: args.postcode,
    });
    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text,
      tags: [
        { name: "kind", value: "exit_intent_come_back" },
        { name: "postcode", value: args.postcode },
      ],
    });
    if (!result.ok && !result.skipped) {
      console.warn("[leads/exit-intent] email send failed", result.error);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[leads/exit-intent] email threw", msg);
  }
}
