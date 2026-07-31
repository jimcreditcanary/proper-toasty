# Social agent runbook

Daily cron that generates + publishes 4 platform-tailored social posts
(LinkedIn, X, Facebook, Instagram) from the /blog corpus, grounded in
UK-authority sources, gated by a factual-claim LLM guardrail.

## What it does, in order

1. Fires at **07:00 UTC daily** (Vercel cron, `vercel.json`).
2. Auths on `Authorization: Bearer $CRON_SECRET`.
3. Picks the day's **pillar** from `src/lib/social/pillars.ts`:
   `Mon/Thu → heat_pump`, `Tue/Fri → solar`, `Wed/Sat → plug_in_solar`,
   `Sun → blog`.
4. Picks a **blog post** for that pillar — newest published that
   wasn't posted on any channel in the last 14 days.
5. Generates 4 platform-tailored posts via **Sonnet 5** with
   `web_search` enabled — cites 1-2 UK-authority sources (gov.uk,
   DESNZ, MCS, Times, Guardian, Which?, Solar Energy UK, BBC).
6. Runs **Haiku 4.5** as a **skeptic guardrail** on each draft.
   Rejects posts whose specific £/%/grant claims can't be traced to
   the blog excerpt or a citation.
7. For approved drafts: resolves the Buffer channel id, calls
   `createPost` (shareNow), logs everything to `social_posts`.

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `CRON_SECRET` | Vercel env | Existing — reused from other crons |
| `BUFFER_ACCESS_TOKEN` | Vercel env | Buffer API bearer token — you already set this |
| `ANTHROPIC_API_KEY` | Vercel env | Existing |
| `NEXT_PUBLIC_APP_URL` | Vercel env | Optional — falls back to request origin |

## Manual triggers

Fire the run right now (from your local machine, against production):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://www.propertoasty.com/api/cron/social-agent | jq .
```

Force a specific pillar (useful for testing a channel that hasn't
had a run today):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.propertoasty.com/api/cron/social-agent?pillar=heat_pump" | jq .
```

## How to inspect what went out

```sql
select platform, pillar, blog_post_slug, factual_check_passed,
       error, posted_at, left(content, 100) as preview
from social_posts
order by posted_at desc
limit 20;
```

Rejected drafts have `factual_check_passed = false` and the
guardrail's reason in `error`. Buffer failures have
`factual_check_passed = true` and the API error in `error`.

## How to pause the agent

Comment out (or delete) the `/api/cron/social-agent` entry in
`vercel.json`, push, redeploy. The route stays live for manual
triggers.

## How to change the pillar rotation

Edit `CALENDAR` in `src/lib/social/pillars.ts`. Keys are UTC
day-of-week (0=Sun ... 6=Sat).

## How to add a new pillar

1. Add the pillar name to the `Pillar` type in `pillars.ts` AND the
   `check` constraint in migration 082 (needs a follow-up
   migration).
2. Add its calendar slot in `CALENDAR`.
3. Add its `PILLAR_ANGLES` entry in `prompts.ts`.
4. Add its CTA URL in `generator.ts` `pillarCtaUrl()`.
5. Add its label in `pillars.ts` `pillarLabel()`.
6. Optionally update `categoryToPillar()` if the blog corpus
   already contains matching categories.

## Known quirks

- **Instagram links aren't clickable** in captions. We ship the
  URL in the log for parity but the caption says "Link in bio".
  Update your IG bio to point at the calculator hub of the week.
- **X 275-char budget** means the model sometimes exceeds it —
  Buffer will reject the post and the run logs the error but
  still counts toward the pillar's "used" state (so it won't
  retry on the same day, deliberate — we don't want to spin the
  agent in a self-correction loop that hallucinates on retries).
- **Cooldown is 14 days per (blog, ANY platform)**. If you publish
  a fresh blog every ~2 days you'll get variety; if the /blog
  cadence slows, the agent will fall through to the next-most-
  recent post.

## What to do if the agent starts drifting

- Read the last 10 rows of `social_posts` — that's the ground truth.
- If drafts are hallucinating figures: the guardrail's failing.
  Tighten the skeptic prompt in `prompts.ts::buildGuardrailPrompt`.
- If posts are going to the wrong platform: check
  `PLATFORM_TO_SERVICE` in `route.ts` and `findChannelId()` in
  `buffer.ts`.
- If Buffer is rejecting posts en masse: verify the token in
  Vercel env hasn't expired.
