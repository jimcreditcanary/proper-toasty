# Blog generator runbook

Weekly cron that autonomously writes + publishes a new /blog post
targeting one of four pillars. Content is AEO-optimised (direct-
answer paragraph, H2-as-question sections, cited UK sources) so it
ranks in Perplexity, ChatGPT Search, and Google's AI Overview.

## What it does, in order

1. Fires **Sunday 09:00 UTC** via Vercel cron (`vercel.json`).
2. Bearer auth: `Authorization: Bearer $CRON_SECRET`.
3. Picks pillar from ISO week rotation:
   - Week % 4 == 0 → `heat_pump`
   - Week % 4 == 1 → `solar`
   - Week % 4 == 2 → `plug_in_solar`
   - Week % 4 == 3 → `boiler_vs_hp`
4. Loads recent posts on this pillar (last 90 days) + last 6 topics
   the generator has tried — feeds them into the writer's exclude
   list so we don't re-cover ground.
5. **Sonnet 5** drafts the post with `web_search` enabled. Cites
   gov.uk / DESNZ / MCS / Ofgem / Solar Energy UK / Nesta / Which?
   / Times / Guardian / BBC.
6. Shape checks: slug is kebab, word count 900-2400, 4-8 H2s,
   ≥3 sources, excerpt ≤200 chars, no floorplan references.
7. **Haiku 4.5** guardrail: rejects if any specific claim can't
   trace to a cited source OR contradicts known-true UK policy.
8. If approved AND slug isn't already taken → insert into
   `blog_posts` (published=true, author='Jim Fell').
9. `llms.txt` + `llms-full.txt` auto-refresh from `blog_posts` on
   their 5-min ISR window — new post gets indexed for LLMs
   automatically.
10. Every outcome (published / rejected / error) logs to
    `blog_gen_runs` (migration 083).

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `CRON_SECRET` | Vercel env | Same as other crons |
| `ANTHROPIC_API_KEY` | Vercel env | Same as social agent |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env | Existing |

## Manual triggers

Fire right now with the calendar pillar:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://www.propertoasty.com/api/cron/blog-generator | jq .
```

Force a specific pillar:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.propertoasty.com/api/cron/blog-generator?pillar=solar" | jq .
```

## How to inspect what happened

Recent runs (both published and rejected):

```sql
select pillar, status, blog_post_slug, error, word_count, created_at
  from blog_gen_runs
 order by created_at desc
 limit 20;
```

If rejection rate creeps above ~30%, tighten the writer prompt
(`src/lib/blog/prompts.ts` — `buildWriterPrompt`) rather than
loosening the guardrail. Bad drafts published are much worse
than drafts skipped.

## How to pause the generator

Comment out (or delete) the `/api/cron/blog-generator` entry in
`vercel.json`, push, redeploy. The route stays live for manual
triggers.

## How to change the pillar rotation

Edit `ROTATION` in `src/lib/blog/pillars.ts`.

## Known quirks

- **Sonnet 5's output cap is ~8k tokens** — the writer prompt is
  tuned to land posts at 1200-2000 words which fits comfortably.
  Going over the cap = truncated content = shape check fails =
  no publish. Add `max_tokens` in `generator.ts` if we push
  longer posts later.
- **Same slug already taken**: the generator rejects rather than
  overwriting. In practice this happens ~never because the writer
  is prompted to pick fresh angles, but the check is defensive.
- **Guardrail defaults to reject** on uncertainty. That's correct
  for a fully-autonomous publisher — better a Sunday with no new
  post than a Sunday with a wrong-numbers post.
