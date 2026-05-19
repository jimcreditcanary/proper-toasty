# Outreach engine — Phase 9 launch runbook

The pre-launch checklist. Work through top-to-bottom; **do not flip
the campaign from `draft` → `active` until every box is ticked.**

The runbook splits into four phases:

  A. Pre-flight (1–2 days before launch) — config + plumbing checks
  B. Internal end-to-end test (the day before) — full flow on real
     installer accounts you own
  C. Bounce + complaint simulation (the day before) — verify
     suppression pipeline
  D. Live launch — flip status + ramp daily limit per the
     conservative warmup schedule

---

## A. Pre-flight checks

### A.1 Run the automated pre-flight script

```bash
npx tsx scripts/outreach/preflight.ts
```

Checks every required env var, verifies the outreach Postmark
token isn't the transactional one, confirms the campaign +
sequence + founder_claims seeds are intact, and that the
eligibility view returns a non-empty pool.

- [ ] Script exits 0 ("PRE-FLIGHT PASSED")

### A.2 Verify DNS records resolve

Use https://mxtoolbox.com/SuperTool.aspx for each of the 4 records
added during Phase 2C:

- [ ] `mail.propertoasty.com` TXT (SPF) resolves
- [ ] `<selector>._domainkey.mail.propertoasty.com` TXT (DKIM) resolves
- [ ] `pm-bounces.mail.propertoasty.com` CNAME → `pm.mtasv.net` resolves
- [ ] `_dmarc.mail.propertoasty.com` TXT (DMARC) resolves

Also confirm in Postmark → Sending Domains → `mail.propertoasty.com`:

- [ ] All four records show as Verified (green)

### A.3 Postmark templates final review

The 8 templates were drafted in Phase 6 + pasted during Phase 2F.
Before going live:

- [ ] Read each `outreach-*.txt` aloud — does it sound like Jim
      would actually write it? Edit if not.
- [ ] Replace `[ADDRESS_TBC]` in every template footer with the
      real registered company address (UK PECR requirement)
- [ ] Postmark → Templates → "Send Test" on each template to your
      own inbox. Verify:
  - All `{{var}}` placeholders render
  - Conditional `{{#var}}…{{/var}}` blocks fall back cleanly when
    Checkatrade/Google scores are blank
  - The List-Unsubscribe header is present (visible in raw source)
  - The plain-text body renders without HTML chrome

### A.4 Vercel webhook endpoints reachable

After PR #63 (Phase 3) deploy, the routes exist. Verify:

- [ ] `https://www.propertoasty.com/api/postmark/outreach-webhook`
      returns 401 (not 404) when hit without auth — proves the
      route is deployed
- [ ] `https://www.propertoasty.com/api/postmark/outreach-inbound`
      same — 401 not 404
- [ ] `https://www.propertoasty.com/api/unsubscribe?token=test`
      returns a redirect to `/unsubscribe?error=Invalid+token`

### A.5 Postmark webhook URLs configured

In Postmark → outreach server → Servers → Webhooks:

- [ ] Outbound webhook URL set to the above outreach-webhook URL
- [ ] Subscribed events: Delivery, Open, Click, Bounce, SpamComplaint,
      SubscriptionChange
- [ ] Custom header: `Authorization: Bearer <OUTBOUND_SECRET>`
      matching your `POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET` env
- [ ] Inbound webhook URL set
- [ ] Inbound custom header: `Authorization: Bearer <INBOUND_SECRET>`
      matching `POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET`
- [ ] MS365 inbox rule (from Phase 2D.1) forwarding replies to
      Postmark's inbound address is active

### A.6 Cron jobs scheduled in Vercel

`vercel.json` already declares the three outreach crons. Vercel
auto-registers them on deploy. Verify in the Vercel dashboard:

- [ ] `/api/cron/outreach/select-batch` scheduled `0 8 * * *`
- [ ] `/api/cron/outreach/send-queue` scheduled `*/5 * * * *`
- [ ] `/api/cron/outreach/follow-up` scheduled `0 7 * * *`

---

## B. Internal end-to-end test

You'll send the full flow to two real email addresses you control —
typically your own + a co-founder's. **Both addresses must be the
email on a claimed installer record** so the email-match security
gate doesn't block the claim.

### B.1 Seed two test recipients

Find the installer IDs you want to enrol (your own claimed installer
+ co-founder's claimed installer, OR pick two real MCS installers
whose emails route to inboxes you control — you can swap their
`installers.email` in Supabase temporarily for the test).

```bash
npx tsx scripts/outreach/seed-test-recipients.ts <installer_id_1> <installer_id_2>
```

The script prints the recipient_id + claim URL for each. Open one
claim URL in a private/incognito browser tab — verify the OutreachHero
renders with the right tier label + credit promise + breakdown.

- [ ] Claim URL renders OutreachHero with correct tier
- [ ] Conditional founder-spots counter shows for founder/early-access
      tiers, hidden for standard
- [ ] Both installers' inbox should receive the initial-template
      email (founder, early-access, or standard depending on the
      live tier state for their region+tech)

### B.2 Trigger the send-queue cron manually

The send-queue runs every 5 minutes by default. To fire it
immediately:

```bash
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://www.propertoasty.com/api/cron/outreach/send-queue
```

Response should be JSON with `processed: 2, sent: 2`.

- [ ] Both test installers receive the email within ~30 seconds
- [ ] Email is plain text (no HTML chrome)
- [ ] All merge variables render correctly
- [ ] List-Unsubscribe is in the raw email source

### B.3 Walk the full claim journey on one recipient

Click the claim link from the email:

- [ ] Landing page = `/installer-signup?id=N&outreach=<token>`
- [ ] OutreachHero shows the tier offer
- [ ] Submit signup form (or click-through if already signed in)
- [ ] After auth, lands on `/installer/onboarding`
- [ ] Walk through all four steps:
  - Profile: upload logo, write bio → credits land per tier
  - Questions: answer 6, Claude drafts the post, review/edit, publish
    → blog post appears at `/blog/<slug>` + credits land
  - Card: enter Stripe test card `4242 4242 4242 4242` (any future
    expiry, any CVC) → SetupIntent succeeds + credits land
- [ ] `/admin/outreach` funnel reflects the conversion (recipient
      moves through queued → sent → delivered → opened → clicked
      → signed_up → completed)
- [ ] `/admin/outreach` founder claims map shows the tier-1 spot
      filled for that region+tech (if the test landed founder)

### B.4 Reply to the test email

From the test address that received the email, reply with a short
sentence. Wait ~30 seconds, then check:

- [ ] Reply appears in Jim's MS365 inbox (forwarded copy)
- [ ] Reply also appears in Postmark's inbound stream
- [ ] `/admin/outreach` "Recent replies" section shows the reply
      with the Claude-classified intent

---

## C. Bounce + complaint simulation

### C.1 Seed the bounce-test recipients

```bash
npx tsx scripts/outreach/seed-bounce-test.ts
```

Creates 3 temporary installers pointing at Postmark's test
addresses (hard bounce, soft bounce, spam complaint). Triggers
nothing automatically — you need to fire the send-queue.

- [ ] Script prints 3 recipient rows + their installer IDs

### C.2 Trigger the send-queue + verify webhook side-effects

```bash
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://www.propertoasty.com/api/cron/outreach/send-queue
```

Wait ~1 minute for Postmark to fire the bounce/complaint webhooks
back. Then check:

- [ ] `/admin/outreach` shows 1 bounce + 1 complaint event in the
      recent funnel
- [ ] Suppression list contains the 2 test addresses
      (`bounce-hard@…` + `spam@…`) — hard bounce + complaint suppress
      immediately
- [ ] Soft bounce address (`bounce-soft@…`) does NOT yet appear in
      suppression (only suppresses at 3 in 7 days)

### C.3 Soft-bounce threshold test (optional)

Re-run the seed-bounce-test 3 times within an hour to hit the
soft-bounce-threshold (3 in 7 days):

- [ ] After the 3rd send to the soft-bounce address, it lands in
      the suppression list with reason `bounced` + source
      `postmark_webhook_soft_threshold`

### C.4 Clean up test installer rows

```sql
DELETE FROM public.installers WHERE source='outreach_bounce_test';
```

(Cascade deletes the recipient rows. Suppression entries + audit
events stay for the records.)

- [ ] Cleanup SQL run

---

## D. Live launch (conservative ramp)

You picked the conservative warmup in Phase 0 decision 9. Schedule:

| Weekday | Daily limit | Notes |
|---|---|---|
| 1 | 5 | Hand-pick the highest-quality installers (Checkatrade ≥4.8, ≥20 reviews) |
| 2 | 10 | Same selection criteria |
| 3 | 20 | |
| 4 | 30 | |
| 5 | 30 | Extra day at this level for safety |
| 6 | 50 | First weekday after this is the first steady-state day |
| 7+ | 50 | Steady state. Evaluate at day 30 for possible bump to 100/day. |

### D.1 Final pre-launch flip (day 0)

```sql
UPDATE public.outreach_campaigns
  SET status = 'active', daily_send_limit = 5, updated_at = now()
WHERE name = 'Q2 2026 Installer Activation';
```

- [ ] Campaign status flipped to `active`
- [ ] Daily limit set to 5 for day 1

### D.2 Hand-pick day-1 recipients

The select-batch cron runs at 08:00 UTC. For days 1–2 you may want
to override its quality-based selection with a hand-picked set —
the highest-rated installers are least likely to bounce/complain,
which protects your sending reputation while it builds.

Before the cron fires (i.e. before 08:00 UTC), seed your hand-picked
recipients:

```bash
npx tsx scripts/outreach/seed-test-recipients.ts <id1> <id2> <id3> <id4> <id5>
```

When the auto-select cron fires later that day, it'll see 5
recipients already enrolled + skip (daily limit reached).

- [ ] Day 1: 5 hand-picked installers seeded before 08:00 UTC
- [ ] Day 2: 10 hand-picked seeded before 08:00 UTC

### D.3 Daily ramp

Each morning before 08:00 UTC, bump the daily limit:

```sql
UPDATE public.outreach_campaigns
  SET daily_send_limit = <new_limit>, updated_at = now()
  WHERE name = 'Q2 2026 Installer Activation';
```

- [ ] Day 3: limit → 20 (let auto-select run from here)
- [ ] Day 4: limit → 30
- [ ] Day 5: limit → 30 (no change — safety day)
- [ ] Day 6: limit → 50

### D.4 Daily monitoring (during the ramp + first 30 days)

Each morning, check `/admin/outreach`:

- [ ] Funnel progressing — opens > 0%, clicks > 0%
- [ ] Bounce rate < 5% (auto-pause threshold)
- [ ] Complaint rate < 0.3% (auto-pause threshold)
- [ ] Recent replies — handle any "interested" reply directly via
      Outlook within 24h. Unsubscribes auto-handled.
- [ ] Founder claims map — note when slots fill (signal of
      conversion momentum)
- [ ] Suppression list growing predictably (a few hard bounces +
      occasional unsubscribes; no spike)

### D.5 Day 30 evaluation

At day 30 of steady-state sending, decide whether to ramp to 100/day:

- [ ] Cumulative bounce rate < 2% → safe to ramp
- [ ] Cumulative complaint rate < 0.1% → safe to ramp
- [ ] Reply rate > 5% → engagement healthy
- [ ] No spam complaints from major providers
      (check Postmark → Servers → Activity → search "spam")

If all green: `UPDATE outreach_campaigns SET daily_send_limit = 100;`

If anything red: hold at 50/day, investigate, repeat at day 60.

Also at day 30: revisit the 441 installers with `first_name IS NULL`
(role-account email + no Companies House match — see PRs #77/#80/#81).
They are still being sent to, but with the bare "Quick question"
subject rather than "Quick question, James". Options for enrichment:
- LinkedIn lookup against company_name (the principal contact is
  usually the founder)
- MCS directory scrape for the named principal contact
- Hand-enrich the top-quality unnamed ones (sort by quality_score,
  cherry-pick the top 50–100)

`select-batch` deprioritises these rows, so they only start flowing
once the named pool is exhausted within each (region, tech_bucket)
cohort — the named cohort hits the wire first while we're still in
warmup.

---

## When something goes wrong

### Bounce/complaint storm

The auto-pause helper flips status to `paused` once thresholds hit
(5% bounce or 0.3% complaint in the trailing 24h, minimum 20
sends). You'll see a Sentry alert + the dashboard status badge
will switch.

Action: investigate the underlying reason BEFORE resuming. Most
common causes:
- Data quality issue (e.g. installer emails extracted incorrectly)
- Sending domain reputation drop (check
  https://www.mail-tester.com)
- Recipient cohort skewed too heavily toward one region (causes
  email-provider rate-limiting)

### Inbox-rule classification wrong

If Claude's inbound classifier misclassifies (e.g. a reply tagged
`out_of_office` when it's actually an interested question), the
recipient gets the wrong treatment.

Action: manually fix via Supabase — update
`outreach_recipients.state` + delete the suppression row if it
was wrong. Update `outreach_events.metadata.intent` for the
audit trail.

### A test installer's email got auto-suppressed

Happens if you used Postmark's test addresses as real
installer.email values. Action:

```sql
DELETE FROM public.outreach_suppression WHERE email = '<test-email>';
```

The eligibility view will start including them again immediately.

---

## After everything

- Mark the campaign `complete` when you've decided you're done with
  this wave (e.g. exhausted the eligibility pool, decided to switch
  strategy, or hit a target conversion count).
- Run a retrospective at day 60: review the funnel, identify which
  templates earned the most clicks, which subject variants worked
  best (Postmark stats), and what to change for the next wave.
