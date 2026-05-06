@AGENTS.md

# Propertoasty (propertoasty.com)

UK property eligibility app — users enter their address, upload a floorplan, and get a pre-survey report covering heat pump (Boiler Upgrade Scheme) and solar PV suitability. Designed so an MCS installer can quote remotely with high confidence.

Forked from `who-am-i-paying`. Same stack, same patterns (auth, credits, Stripe, blog, enterprise page) — different domain and different check logic.

## Tech stack

- Next.js 16 (App Router) with TypeScript — heed `AGENTS.md` re: breaking changes vs older Next
- Supabase — auth, Postgres, storage (floorplans go in a private bucket, signed URLs, 90-day retention)
- Stripe — credits / per-check payments (first check free, then £4.99 / £12 bundle)
- Anthropic Claude (Opus 4.7) — floorplan vision analysis, strict JSON output with zod validation
- Tailwind CSS v4 + shadcn/ui
- Google Maps Platform — Places autocomplete + Solar API (`buildingInsights`) + Static Maps
- EPC Register — cert lookup by postcode, recommendations for BUS eligibility

## Project structure (target)

```
src/
├── app/
│   ├── (marketing)/              — home, enterprise, blog
│   ├── check/                    — 6-step eligibility flow (address → preview → context → floorplan → analysis → report)
│   ├── report/[id]/              — saved report (auth or signed share link)
│   └── api/
│       ├── address/autocomplete  — proxies Google Places
│       ├── address/details       — proxies Google Places details
│       ├── epc/by-address        — proxies epc.opendatacommunities.org
│       ├── solar/building        — proxies Google Solar buildingInsights
│       ├── solar/imagery         — proxies Google Static Maps (satellite)
│       ├── floorplan/upload      — signed URL issuer
│       ├── analyse               — orchestrates EPC + Solar + Claude floorplan analysis
│       └── report/pdf            — generates downloadable PDF
├── lib/
│   ├── services/
│   │   ├── places.ts             — Places autocomplete + details
│   │   ├── solar.ts              — buildingInsights wrapper (quality fallback HIGH→MEDIUM→LOW, 30-day cache by rounded lat/lng)
│   │   ├── epc.ts                — EPC API wrapper (postcode → LMK → cert + recommendations)
│   │   ├── claude.ts             — Anthropic SDK wrapper
│   │   └── eligibility.ts        — PURE functions: BUS rules engine + solar suitability
│   ├── schemas/                  — zod schemas for every external payload
│   └── prompts/
│       └── floorplan-analysis.ts — Claude system + user prompt
```

## External API reference

- **Google Solar API** — full field-by-field schema + what we surface vs. what's
  still available in `src/lib/schemas/solar.ts`. Any Google response field (incl.
  finance blocks, per-panel placements, carbon factor, imagery dates) is
  captured via `.passthrough()` — we just don't render it all yet.
- **EPC (GOV.UK)** — `src/lib/services/epc.ts`. UPRN-first search against
  `api.get-energy-performance-data.communities.gov.uk`, bearer auth.
- **Postcoder** — `src/lib/services/postcoder.ts`. Postcode → address list with
  UPRN + lat/lng (Royal Mail PAF data).
- **Postcodes.io** — postcode → country (for England/Wales gate) + centroid
  lat/lng fallback when Postcoder addtags are absent.
- **PVGIS v5.3** — annual kWh yield from a given kWp / pitch / azimuth.
- **Claude Opus 4.7** — floorplan vision analysis; strict JSON via zod.

## Key patterns

- **Everything server-side.** Never ship API keys to the browser. All third-party calls go through `app/api/*` route handlers.
- **Eligibility rules as pure functions.** Unit-testable, auditable against Ofgem BUS guidance. Cite the guidance section in comments next to each rule.
- **Zod validate every external payload** so Google/Ofgem schema drift fails loudly in one place.
- **Cache Solar API `buildingInsights`** by rounded lat/lng for 30 days — it's expensive and idempotent for a given property.
- **Floorplans are personal data.** Private bucket, signed URLs, 90-day retention, user-initiated delete supported.

## Non-negotiables

- England & Wales only for BUS. Gate Scottish/NI postcodes with a "coming soon" state.
- Never represent output as a final engineering assessment. Copy says "pre-survey indication" / "suitability check" — never "quote" or "design".
- **Never wipe `public.installers` or `public.blog_posts`.** Both hold expensively-acquired content (5,500-row MCS directory import; hand-written SEO blog posts). Any nuke / truncate / wipe script — including the dynamic "loop through pg_tables" pattern — MUST add `'installers'` and `'blog_posts'` to the keep-list alongside `admin_settings` and `api_cache`. If a script in this repo is missing them, fix it before running.
- MCS / BUS terminology must be accurate. Do not invent grant numbers.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — vitest run (one-shot)
- `npm run test:watch` — vitest watch mode

## Observability (free tiers)

Both no-op silently when env vars are unset, so dev / preview without
secrets continues to work fine.

**Sentry** (errors + perf). Free tier: 5K errors/mo, 10K perf events/mo.
- `SENTRY_DSN` — server-side reporting
- `NEXT_PUBLIC_SENTRY_DSN` — browser reporting (same DSN, exposed)
- `SENTRY_AUTH_TOKEN` — for source-map upload at build time
- `SENTRY_ORG`, `SENTRY_PROJECT` — for source-map upload

**PostHog** (product analytics). Free tier: 1M events/mo.
- `POSTHOG_API_KEY` — project key (starts with `phc_`)
- `POSTHOG_HOST` — defaults to `https://eu.i.posthog.com` (EU
  residency for UK customers)

Event taxonomy lives in `src/lib/analytics.ts` — `EventMap` is the
single source of truth, adding events = adding a key. Events fire
fire-and-forget from API routes; never await captures in a hot path.

## Database

Existing `who-am-i-paying` schema in `supabase/migrations/001_initial_schema.sql` handles users/credits/Stripe. Propertoasty adds `checks` and `check_results` tables (see build prompt).
