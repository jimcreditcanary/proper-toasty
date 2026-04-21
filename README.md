# Propertoasty

**propertoasty.com** — a web app that helps UK homeowners determine whether their property is eligible for and suited to a heat pump and/or solar PV upgrade, and produces a pre-survey report an MCS-certified installer can use to quote remotely with high confidence.

Forked from `who-am-i-paying` (same Next.js / Supabase / Stripe / Anthropic stack).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

- Next.js 16 (App Router) + TypeScript — see `AGENTS.md` for Next.js version notes
- Supabase — auth, database, storage (floorplans)
- Stripe — credits / per-check payments
- Anthropic Claude (Opus 4.7) — floorplan vision analysis
- Tailwind CSS v4 + shadcn/ui
- Google Maps Platform — Places autocomplete, Solar API, Static Maps
- EPC Register (`epc.opendatacommunities.org`) — Energy Performance Certificates

## Scope

**England & Wales only.** Scotland uses Home Energy Scotland loans; NI uses the Boiler Replacement Scheme — out of scope for now.

Pre-survey indication only — not an engineering design. Final quote requires an on-site heat loss survey by an MCS installer.
