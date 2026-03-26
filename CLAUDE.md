@AGENTS.md

# whoamipaying.co.uk

Invoice verification app — users upload invoices, Claude extracts details, then we verify against Companies House, HMRC VAT, and bank account APIs.

## Tech Stack

- Next.js (App Router) with TypeScript
- Supabase (auth, database, storage)
- Stripe (credit purchases)
- Anthropic Claude API (invoice data extraction)
- Tailwind CSS + shadcn/ui (base-nova style, zinc base)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/    — Upload invoice, extract data via Claude
│   │   ├── verify/     — Run Companies House / HMRC / bank checks
│   │   ├── credits/    — Check balance / create Stripe checkout
│   │   └── webhook/    — Stripe webhook handler
│   ├── auth/
│   │   ├── callback/   — Supabase auth callback
│   │   ├── login/      — Login page
│   │   └── signup/     — Signup page
│   └── dashboard/      — Protected dashboard
├── lib/
│   ├── supabase/       — Client, server, admin, middleware helpers
│   ├── api-auth.ts     — API key authentication for external API access
│   ├── stripe.ts       — Stripe client
│   └── anthropic.ts    — Anthropic client
├── types/
│   └── database.ts     — Supabase generated types
└── middleware.ts        — Auth session refresh + route protection
```

## Key Patterns

- **Dual auth**: Dashboard uses Supabase session cookies; external API uses Bearer token (api_key from users table)
- **Credit system**: Atomic deduction via `deduct_credit` Postgres function to prevent race conditions
- **File uploads**: Stored in Supabase Storage `invoices` bucket, path: `{user_id}/{timestamp}-{filename}`
- **Verification**: `/api/extract` extracts data, `/api/verify` runs all three checks in parallel

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## Database

Schema is in `supabase/migrations/001_initial_schema.sql`. Run against your Supabase project via the SQL editor or `supabase db push`.
