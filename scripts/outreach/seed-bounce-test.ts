// scripts/outreach/seed-bounce-test.ts
//
// Verifies the bounce + complaint webhook path end-to-end by
// sending to Postmark's test addresses, which deterministically
// trigger the corresponding webhook events.
//
// Postmark test addresses (from https://postmarkapp.com/developer/user-guide/send-email-with-api/bounce-handling):
//
//   bounce-hard@blackhole.postmarkapp.com    → HardBounce webhook
//   bounce-soft@blackhole.postmarkapp.com    → SoftBounce webhook
//   spam@blackhole.postmarkapp.com           → SpamComplaint webhook
//
// (Postmark periodically renames these — check the current values
// in your dashboard's "Bounce types" reference if a test fails.)
//
// The script creates temporary installer rows pointing at those
// addresses + a recipient row each, then triggers an immediate send.
//
// CLEANUP at the end: deletes the test installer rows + their
// recipient rows. The webhook side-effects (suppression entries,
// outreach_events rows) persist for verification.
//
// Usage:
//
//   npx tsx scripts/outreach/seed-bounce-test.ts
//
// After running:
//   - Watch /admin/outreach for the bounce events appearing in the
//     funnel + the test emails landing in the suppression list
//   - Verify soft-bounce counter increment (re-run 3x to hit the
//     threshold of 3 in 7 days)

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { mintClaimToken } from "../../src/lib/outreach/claim-token";

const TEST_ADDRESSES = [
  { email: "bounce-hard@blackhole.postmarkapp.com", label: "Hard bounce" },
  { email: "bounce-soft@blackhole.postmarkapp.com", label: "Soft bounce" },
  { email: "spam@blackhole.postmarkapp.com", label: "Spam complaint" },
];

async function main() {
  const admin = createAdminClient();

  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(1);
  const campaign = campaigns?.[0];
  if (!campaign) {
    console.error("No campaign found.");
    process.exit(1);
  }

  console.log(
    `Seeding bounce-test recipients into '${campaign.name}' (id=${campaign.id})\n`,
  );

  const created: { installerId: number; recipientId: string }[] = [];

  for (const { email, label } of TEST_ADDRESSES) {
    // Temporary installer row.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: installer, error: instErr } = await (admin as any)
      .from("installers")
      .insert({
        certification_number: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        certification_body: "TEST",
        company_name: `Test ${label}`,
        email,
        cap_air_source_heat_pump: true,
        region_london: true,
        source: "outreach_bounce_test",
        scraped_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (instErr || !installer) {
      console.error(`  ✗ Failed to create test installer for ${email}:`, instErr);
      continue;
    }

    const placeholder = `pending-${crypto.randomUUID()}`;
    const { data: recipient, error: recErr } = await admin
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
    if (recErr || !recipient) {
      console.error(`  ✗ Failed to create recipient for ${email}:`, recErr);
      continue;
    }

    const token = mintClaimToken(recipient.id);
    await admin
      .from("outreach_recipients")
      .update({ claim_token: token })
      .eq("id", recipient.id);

    console.log(`  ✓ ${label} → ${email}`);
    console.log(`     installer_id:  ${installer.id}`);
    console.log(`     recipient_id:  ${recipient.id}`);
    console.log("");
    created.push({ installerId: installer.id, recipientId: recipient.id });
  }

  console.log("Recipients enqueued.\n");
  console.log("Next steps:");
  console.log(
    "  1. Trigger the send-queue immediately: curl -X GET -H 'Authorization: Bearer $CRON_SECRET' \\\n     https://<your-app>/api/cron/outreach/send-queue",
  );
  console.log(
    "  2. Within ~1 minute Postmark will fire the bounce/complaint webhook for each",
  );
  console.log(
    "  3. Verify /admin/outreach shows the events + emails in the suppression list",
  );
  console.log(
    "  4. To clean up the test installer rows when done:\n     DELETE FROM public.installers WHERE source='outreach_bounce_test';",
  );
  console.log("");

  // Print cleanup SQL for convenience.
  if (created.length > 0) {
    console.log("Cleanup query for THIS run only (preserves webhook side-effects):");
    console.log(
      `  DELETE FROM public.installers WHERE id IN (${created.map((c) => c.installerId).join(", ")});`,
    );
  }
}

void main();
