// scripts/outreach/seed-test-recipients.ts
//
// Enqueue test recipients into the active campaign so the send-queue
// cron picks them up on its next tick. Use for internal end-to-end
// testing before opening up to real installers.
//
// The script DOES NOT create installer rows — it expects the
// installer_ids you pass to already exist + have a real email that
// you control (typically Jim's own claimed installer + a co-founder's
// claimed installer).
//
// Usage:
//
//   npx tsx scripts/outreach/seed-test-recipients.ts <installer_id> [<installer_id> ...]
//
// Example: Jim's claimed installer id is 42, co-founder's is 73:
//
//   npx tsx scripts/outreach/seed-test-recipients.ts 42 73
//
// The script will print the recipient ids + claim URLs so you can
// verify the landing page from another tab.

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { mintClaimToken } from "../../src/lib/outreach/claim-token";

async function main() {
  const args = process.argv.slice(2);
  const installerIds = args
    .map((a) => Number(a))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (installerIds.length === 0) {
    console.error(
      "Usage: npx tsx scripts/outreach/seed-test-recipients.ts <installer_id> [<installer_id> ...]",
    );
    process.exit(1);
  }

  const admin = createAdminClient();

  // Find the active or draft campaign.
  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(1);
  const campaign = campaigns?.[0];
  if (!campaign) {
    console.error("No campaign found — run the m065 seed first.");
    process.exit(1);
  }
  console.log(
    `Using campaign: '${campaign.name}' (id=${campaign.id}, status=${campaign.status})\n`,
  );

  const appBase = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");

  for (const installerId of installerIds) {
    // Resolve installer for the printout.
    const { data: installer } = await admin
      .from("installers")
      .select("id, company_name, email")
      .eq("id", installerId)
      .maybeSingle<{ id: number; company_name: string; email: string | null }>();
    if (!installer) {
      console.warn(`  ✗ Installer ${installerId} not found — skipping.`);
      continue;
    }
    if (!installer.email) {
      console.warn(
        `  ✗ Installer ${installerId} (${installer.company_name}) has no email on file — skipping.`,
      );
      continue;
    }

    // Insert with a placeholder token first, then mint + update with
    // the real token (matches the pattern in select-batch/route.ts).
    const placeholder = `pending-${crypto.randomUUID()}`;
    const { data: created, error } = await admin
      .from("outreach_recipients")
      .insert({
        campaign_id: campaign.id,
        installer_id: installer.id,
        state: "queued",
        current_step: 0,
        next_action_at: new Date().toISOString(),
        claim_token: placeholder,
      })
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) {
      if (error.code === "23505") {
        console.warn(
          `  · Installer ${installer.id} (${installer.company_name}) already enrolled in this campaign — skipping.`,
        );
        continue;
      }
      console.error(
        `  ✗ Insert failed for installer ${installer.id}: ${error.message}`,
      );
      continue;
    }
    if (!created) continue;

    const token = mintClaimToken(created.id);
    await admin
      .from("outreach_recipients")
      .update({ claim_token: token })
      .eq("id", created.id);

    await admin.from("outreach_events").insert({
      recipient_id: created.id,
      event_type: "queued",
      metadata: {
        installer_id: installer.id,
        seeded_by: "test_script",
      },
    });

    const claimUrl = `${appBase}/installer-signup?id=${installer.id}&outreach=${encodeURIComponent(token)}`;
    console.log(`  ✓ ${installer.company_name} (${installer.email})`);
    console.log(`     recipient_id: ${created.id}`);
    console.log(`     claim URL:    ${claimUrl}`);
    console.log("");
  }

  console.log(
    "Done. The send-queue cron (every 5 min during the campaign's window) will pick these up + send the initial template.",
  );
  console.log(
    "If the campaign is in draft status, flip to active first: UPDATE public.outreach_campaigns SET status='active' WHERE id='" +
      campaign.id +
      "';",
  );
  console.log(
    "To trigger an immediate send, hit /api/cron/outreach/send-queue with the CRON_SECRET Bearer token.",
  );
}

void main();
