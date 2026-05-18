# Outreach email templates

The 8 plain-text templates that drive the cold outreach sequence.
Each `.txt` file in this directory is the **Text Body** you paste
into the corresponding Postmark template (created during Phase 2F).

## Paste-to-Postmark workflow

For each `.txt` file:

1. Open Postmark → `propertoasty-outreach` server → Templates
2. Click into the template with the matching alias (filename without `.txt`)
3. **Subject field**: set to `{{subject}}` (Mustachio merge variable)
   — the actual per-send subject comes from
   `outreach_email_sequence.subject_variants` and gets passed to
   Postmark as a `subject` merge var at send-time. Don't hardcode
   a subject in the template.
4. **Text Body field**: paste the contents of the `.txt` file
5. **HTML Body field**: leave blank (Postmark serves text-only)
6. Save

After all 8 are pasted, do a Postmark "Send Test" on each to your
own inbox + check that:
- All `{{var}}` placeholders render with the test data
- Conditional `{{#var}}...{{/var}}` blocks fall back gracefully
  when a var is empty (Checkatrade-less installers etc.)
- Subject renders from the test data's `subject` field
- List-Unsubscribe link is present (Postmark renders this from
  the headers we pass at send-time, not the template body — you
  won't see it in the test preview but it'll be on real sends)

## Placeholder you must fill in before going live

Every template footer contains `[ADDRESS_TBC]` — replace with the
real registered company address before publishing. UK PECR
requires this on every commercial email.

Suggested format:

```
Propertoasty Ltd · 123 Example Street, London SW1A 1AA · Company no 12345678
```

If the company is sole-trader or partnership, swap "Ltd" + company
number for the appropriate equivalent.

## Merge variables available

Built by `src/lib/outreach/merge-vars.ts`. Mustachio-syntax.

| Variable | Sample | Notes |
|---|---|---|
| `{{first_name}}` | Acme | First word of `company_name`, stripped of Ltd/Limited/LLP/PLC/Co |
| `{{company_name}}` | Acme Heating Ltd | Verbatim from installers table |
| `{{town}}` | Surrey | County fallback (no town column; postcode area as final fallback) |
| `{{region}}` | the West Midlands | Human-readable region label |
| `{{tech_bucket_display}}` | heat pump | "heat pump" / "solar PV" / "battery storage" / "solar thermal" |
| `{{checkatrade_score}}` | 4.8 | Empty when not on file — wrap in `{{#checkatrade_score}}...{{/checkatrade_score}}` |
| `{{checkatrade_review_count}}` | 87 | Same — empty when missing |
| `{{google_rating}}` | 4.9 | Empty when not on file |
| `{{google_review_count}}` | 42 | Same |
| `{{tier_label}}` | Founder | "Founder" / "Early Access" / "Standard" |
| `{{tier_credits}}` | 300 | 300 / 100 / 30 |
| `{{founder_spots_remaining}}` | 3 | Of 5; only meaningful for early-access tier |
| `{{claim_url}}` | https://… | Full URL to /installer-signup with HMAC outreach token |
| `{{unsubscribe_url}}` | https://… | Full URL to /api/unsubscribe with HMAC outreach token |

## Mustachio conditional patterns

Mustachio (Postmark's templating) treats empty string + null +
undefined as falsy. Use this pattern for review-score fallback
chains:

```
{{#checkatrade_score}}with a {{checkatrade_score}}-star Checkatrade{{/checkatrade_score}}{{^checkatrade_score}}{{#google_rating}}with a {{google_rating}}-star Google{{/google_rating}}{{/checkatrade_score}}
```

Reads as: "if checkatrade exists, use it; else if google_rating
exists, use that; else render nothing".

`{{^var}}` is the inverted section — renders when var is empty.

## Per-template aliases + sequence position

| Alias | Step | Condition | When it fires |
|---|---|---|---|
| `outreach-initial-founder` | 0 | always | Initial send, recipient's tier preview is founder |
| `outreach-initial-early-access` | 0 | always | Initial send, recipient's tier preview is early_access |
| `outreach-initial-standard` | 0 | always | Initial send, recipient's tier preview is standard |
| `outreach-resend-not-opened` | 1 | not_opened | 4 days after initial if no open registered |
| `outreach-why-us` | 2 | opened_not_clicked | 4 days after step 1 if opened but no click |
| `outreach-demand-signal` | 3 | not_signed_up | 7 days after step 2 if still not signed up |
| `outreach-final-call` | 4 | not_signed_up | 10 days after step 3 if still not signed up |
| `outreach-spot-counter` | — | (deferred) | Created in Postmark; not wired into the sequence yet (see note below) |

### outreach-spot-counter deferral

The brief described this template firing 2 days after a click
without a signup. Wiring it into the current sequence cleanly
requires either a branch in the follow-up scheduler or a
separately-triggered cron job; both are out of scope for Phase 6.

The template body is written + ready in `outreach-spot-counter.txt`
so the Postmark template Jim created in Phase 2F has real content.
A future phase (Phase 8 compliance hardening or its own follow-up
PR) can add the trigger logic.

## Voice + style rules (from the brief — non-negotiable)

Each template was drafted against these rules. Edit only if a rule
is clearly broken or the rule itself is being changed:

- **Trust-first.** Every email + landing surface reinforces:
  reject any lead one-click, no charge until value, no
  subscription, no minimum.
- **Transactional feel, not marketing.** Plain text, single
  sender, no images, no marketing chrome, no emoji in subject
  lines.
- **Personalisation must be load-bearing.** If you strip the
  `{{...}}` tokens and the email still reads as a generic blast,
  it's not personalised enough.
- **Sign off "Jim".** No title, no signature block beyond name +
  reply email.
- **Footer.** Physical address (UK PECR), unsubscribe link.
