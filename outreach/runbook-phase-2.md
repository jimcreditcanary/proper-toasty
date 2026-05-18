# Outreach engine — Phase 2 runbook

Manual setup checklist for Postmark + DNS. Do **NOT** run Phase 3
code (cron, webhooks, send-queue) until every box below is ticked.

The order matters — DNS records propagate over the steps below and a
failed DKIM lookup will silently degrade deliverability for the whole
campaign. Don't skip ahead.

---

## 2A — Fix existing DNS issues on `propertoasty.com`

These are pre-existing problems on the **transactional** Postmark
setup that I noticed during Phase 0 discovery. Fixing them now stops
the wider domain reputation from dragging down the outreach
subdomain.

### A.1 — Repair the malformed DMARC record

The current `_dmarc.propertoasty.com` TXT record reads:

```
v=DMARC1; p=none; rua=mailto:dmarc@propertoasty.com; ruf=mailto:dmarc@propertoasty.com; fo=1; adkim=r; aspf=r; pct=100v=spf1 include:spf.mtasv.net -all
```

The `pct=100v=spf1…` part is concatenated SPF that **invalidates the
`pct` tag** — most receivers will silently ignore the whole DMARC
record. Replace with:

```
v=DMARC1; p=none; rua=mailto:dmarc@propertoasty.com; ruf=mailto:dmarc@propertoasty.com; fo=1; adkim=r; aspf=r; pct=100
```

- [ ] Updated `_dmarc.propertoasty.com` TXT record at your DNS host
- [ ] Verified change at https://mxtoolbox.com/dmarc.aspx

### A.2 — Add Postmark DKIM to `propertoasty.com`

Postmark is sending transactional mail SPF-aligned but **unsigned**.
Adding DKIM brings the existing transactional traffic up to spec.

1. Postmark → Sender Signatures → `propertoasty.com` → DKIM
2. Copy the displayed Hostname + Value
3. Add as a TXT record at your DNS host
4. Click "Verify" in Postmark

- [ ] DKIM TXT record added
- [ ] Postmark shows the signature as Verified

---

## 2B — Create the new Postmark outreach server

You said this is already done — confirm + capture the server token.

- [ ] `propertoasty-outreach` server exists in Postmark
- [ ] **Broadcast Message Stream** created inside that server (NOT Transactional — wrong stream type silently degrades deliverability)
- [ ] Server API token copied (you'll paste into `.env.local` in step 2G)

> **Note:** Sender Signatures are account-level — the existing ones
> apply across all servers. We won't be using Sender Signatures for
> outreach (we use a verified Sending Domain instead, which DKIM-signs
> the broadcast traffic on the domain rather than per-address).

---

## 2C — Add `mail.propertoasty.com` sending domain

In the **outreach** server (not the transactional one):

1. Sending Domains → Add Domain → enter `mail.propertoasty.com`
2. Postmark displays 3 DNS records. Add all three at your DNS host
   (exact values from Postmark UI — these are illustrative):

| Type | Host | Value | Purpose |
|---|---|---|---|
| TXT | `mail.propertoasty.com` | `v=spf1 include:spf.mtasv.net ~all` | SPF for the subdomain |
| TXT | `<selector>._domainkey.mail.propertoasty.com` | `k=rsa; p=MIIBIj…` (long) | DKIM signing key |
| CNAME | `pm-bounces.mail.propertoasty.com` | `pm.mtasv.net` | Return-Path — **critical**, this is the most-missed record |

3. Add the subdomain DMARC (Postmark won't generate this for you):

| Type | Host | Value |
|---|---|---|
| TXT | `_dmarc.mail.propertoasty.com` | `v=DMARC1; p=none; rua=mailto:dmarc@propertoasty.com; aspf=r; adkim=r; pct=100` |

4. Wait ~10 minutes for propagation, then click "Verify" in Postmark
   for each record.

- [ ] All 3 Postmark-generated DNS records added
- [ ] Subdomain DMARC record added
- [ ] All 4 records resolving (check https://mxtoolbox.com/SuperTool.aspx)
- [ ] Postmark shows the sending domain as Verified

---

## 2D — Configure sender identity

In the outreach server's settings:

- **From address**: `jim@mail.propertoasty.com`
- **From name**: `Jim @ Proper Toasty`
- **Reply-To**: `jim@propertoasty.com`

> Why split From + Reply-To: the From address sends from the
> outreach subdomain (clean reputation), but replies route to your
> primary MS365 inbox so you see them in Outlook like any other email.

### D.1 — MS365 inbox rule for inbound classification

To get replies into the automated classification pipeline (Phase 3.5)
while ALSO seeing them in Outlook, set up a forwarding rule:

1. Outlook → Rules → New Rule
2. Condition: "When a message arrives" AND
   - Subject contains "Re:" (catches all reply prefixes), OR
   - Message headers contain a known outreach token pattern
3. Action: Forward a **copy** to `<inbound-address-from-Postmark>` (Postmark generates this once the inbound webhook is configured in 2E)
4. Action: Keep the original in inbox

> Important: forward a **copy**, not redirect. Redirect would move
> the message out of your inbox.

- [ ] From/From name/Reply-To configured
- [ ] MS365 inbox rule created (pending step 2E for the inbound address)

---

## 2E — Webhooks

Set up **after** the site has the webhook routes deployed (those
ship in Phase 3, so come back to this step then).

### E.1 — Outbound webhook (events)

- URL: `https://www.propertoasty.com/api/postmark/outreach-webhook`
- Subscribed events: Delivery, Open, Click, Bounce, SpamComplaint, SubscriptionChange
- Generate a webhook secret — paste into `.env.local` as `POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET`

### E.2 — Inbound webhook

- URL: `https://www.propertoasty.com/api/postmark/outreach-inbound`
- Configured at the server level (so any inbound message hits the app)
- Postmark generates an inbound email address — copy that into the MS365 rule above (step 2D.1)
- Generate a webhook secret — paste into `.env.local` as `POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET`

- [ ] Outbound webhook configured (deferred to post-Phase-3)
- [ ] Inbound webhook configured (deferred to post-Phase-3)

---

## 2F — Templates

Create 8 templates in the outreach server (Templates → Create
Template → Layoutless / Plain text). Aliases (case-sensitive — these
match the values seeded into `outreach_email_sequence`):

- [ ] `outreach-initial-founder`
- [ ] `outreach-initial-early-access`
- [ ] `outreach-initial-standard`
- [ ] `outreach-resend-not-opened`
- [ ] `outreach-why-us`
- [ ] `outreach-spot-counter`
- [ ] `outreach-demand-signal`
- [ ] `outreach-final-call`

Leave the templates empty for now — copy gets written in Phase 6 +
pasted in here for Jim to review before going live.

---

## 2G — Environment variables

Add to `.env.local` (and `.env.example` already has placeholders
from Phase 2 prep):

```
POSTMARK_OUTREACH_SERVER_TOKEN=<paste from Postmark outreach server>
POSTMARK_OUTREACH_SENDER_EMAIL=jim@mail.propertoasty.com
POSTMARK_OUTREACH_SENDER_NAME=Jim @ Proper Toasty
POSTMARK_OUTREACH_REPLY_TO=jim@propertoasty.com
POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET=<generate, paste in Postmark>
POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET=<generate, paste in Postmark>
OUTREACH_CLAIM_TOKEN_SECRET=<generate via: openssl rand -hex 32>
```

**Do NOT reuse `POSTMARK_SERVER_TOKEN` (the transactional one) here.**
The Phase 3 send code reads `POSTMARK_OUTREACH_SERVER_TOKEN` and will
refuse to fall back to the transactional token.

For Vercel:
- Add the same vars to Vercel project Settings → Environment Variables (Production + Preview + Development)

- [ ] All 7 vars added to `.env.local`
- [ ] All 7 vars added to Vercel (Production)
- [ ] All 7 vars added to Vercel (Preview)

---

## 2H — Warm-up schedule (conservative ramp)

You asked for slower than the brief's original 10→20→35→50 over 5
days. Revised plan:

| Weekday | Send count | Notes |
|---|---|---|
| 1 | 5 | Hand-pick from `outreach_eligibility` — Checkatrade ≥4.8 + 20+ reviews |
| 2 | 10 | Same selection rule |
| 3 | 20 | |
| 4 | 30 | |
| 5 | 30 | Same as day 4 — extra day at this level for safety |
| 6 | 50 | |
| 7 | 50 | First steady-state day |
| 8–30 | 50 | Steady; evaluate for 100/day at day 30 |

**Why hand-pick the first ~15 sends:** high-quality recipients are
the least likely to mark as spam, building reputation cleanly. Don't
let the auto-batch selector run blind during warmup days 1–2.

To enable: keep the campaign in `draft` status until the templates
are signed off (Phase 6), then UPDATE the row to `active` and set
`daily_send_limit = 5`. Bump the limit each weekday morning.

- [ ] Warm-up schedule understood + agreed
- [ ] Reminder set to bump `daily_send_limit` each weekday morning

---

## 2I — DMARC ratchet plan (post-launch)

Start both DMARC records at `p=none` (current state). Don't escalate
until you've got 30 days of clean DMARC reports.

| Stage | Trigger | Action |
|---|---|---|
| 1 | Now | `p=none` on both `propertoasty.com` and `mail.propertoasty.com` |
| 2 | 30 days clean reports | `p=quarantine` on `mail.propertoasty.com` (subdomain first — lower blast radius) |
| 3 | Another 30 days clean | `p=quarantine` on `propertoasty.com` (root domain) |
| 4 | Another 30 days clean | `p=reject` on `mail.propertoasty.com` |
| 5 | Another 30 days clean | `p=reject` on `propertoasty.com` |

DMARC reports land at `dmarc@propertoasty.com` daily. Skim weekly,
look for any source you don't recognise.

- [ ] `dmarc@propertoasty.com` mailbox exists + you can read it
- [ ] Calendar reminder set for 30-day DMARC review

---

## When everything's ticked

Tell me and I'll proceed to Phase 3 (cron + send queue + webhook
routes). Until then, the Phase 1 schema sits dormant — no traffic
flows, no emails fire.
