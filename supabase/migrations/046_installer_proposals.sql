-- I4: Send proposal
--
-- After an installer's been to the property (or even just after
-- accepting a lead) they can send the homeowner a written quote
-- with line items. The homeowner sees a clean tokenised page they
-- can accept or decline without logging in.
--
-- Proposals are scoped per (installer, lead). Multiple proposals
-- can exist for the same lead — installer might send v2 with revised
-- pricing — and the latest sent one is canonical. Earlier ones
-- archive into the list view so the installer has a paper trail.
--
-- VAT is per-proposal: 0% (default — green tech relief through 2027
-- for heat pumps + solar PV + battery) or 20% standard rate. Toggle
-- on the builder; both subtotal and VAT are persisted so we never
-- recompute at render time and risk drift.
--
-- Money: pence integers throughout (same convention as the credits
-- + Stripe code). Never floats.
--
-- Token: same HMAC pattern as report-share (signReportSig analogue
-- in /lib/email/tokens.ts). The token stamped on the row is the
-- URL-safe form (`{compactUuid}.{hex-hmac}`) so the homeowner-facing
-- /p/<token> route can verify cheaply before any DB hit.

-- ─── Enums ──────────────────────────────────────────────────────────

create type proposal_status as enum (
  'draft',     -- being edited by installer, not visible to homeowner
  'sent',      -- live with homeowner, awaiting their decision
  'accepted',  -- homeowner clicked accept
  'declined'   -- homeowner clicked decline (or otherwise rejected)
);

-- ─── Table ──────────────────────────────────────────────────────────

create table public.installer_proposals (
  id uuid primary key default gen_random_uuid(),

  -- Ownership
  installer_id      bigint not null references public.installers(id),
  installer_lead_id uuid not null references public.installer_leads(id) on delete cascade,
  homeowner_lead_id uuid references public.homeowner_leads(id) on delete set null,

  -- Lifecycle
  status proposal_status not null default 'draft',

  -- Content
  -- line_items: JSON array of { id, description, quantity, unit_price_pence }.
  -- We compute totals server-side at save+send time and persist them
  -- so PostgREST queries can sort/filter by total_pence without
  -- having to walk the jsonb.
  line_items jsonb not null default '[]'::jsonb,
  cover_message text,

  -- VAT — basis points (0 = 0%, 2000 = 20%). Default 0% (UK green
  -- tech relief through 2027 for heat pumps / solar PV / battery).
  vat_rate_bps integer not null default 0
    check (vat_rate_bps between 0 and 10000),

  -- Persisted totals — computed at save+send. Pence integers.
  subtotal_pence integer not null default 0
    check (subtotal_pence >= 0),
  vat_pence integer not null default 0
    check (vat_pence >= 0),
  total_pence integer not null default 0
    check (total_pence >= 0),

  -- Token for the homeowner-facing /p/<token> URL. Unique so the
  -- index does double duty as the lookup. URL-safe HMAC form
  -- (compactUuid.hex), minted at first save.
  homeowner_token text not null unique,

  -- Lifecycle timestamps — optional fields populated as state
  -- transitions happen. Querying the latest accepted proposal for
  -- a lead is `order by accepted_at desc nulls last`.
  sent_at timestamptz,
  viewed_at timestamptz,        -- first homeowner page load
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,          -- optional homeowner-supplied reason

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes — tiny table to start, but the per-installer + per-lead
-- queries are the only access patterns that matter.
create index installer_proposals_installer_id_idx
  on public.installer_proposals (installer_id);

create index installer_proposals_installer_lead_id_idx
  on public.installer_proposals (installer_lead_id);

create index installer_proposals_status_idx
  on public.installer_proposals (status);

create index installer_proposals_created_at_idx
  on public.installer_proposals (created_at desc);

-- Auto-update updated_at on every row change. Reuse the function
-- defined back in 028_installers.sql.
create trigger installer_proposals_updated_at_trigger
before update on public.installer_proposals
for each row execute function public.installers_set_updated_at();

-- RLS — service role only. The /api/installer/proposals/* and
-- /api/proposals/[token]/* routes do explicit auth checks before
-- reading or writing.
alter table public.installer_proposals enable row level security;

comment on table public.installer_proposals is
  'I4: per-lead quote sent from installer to homeowner. Tokenised /p/<token> view, accept/decline gates.';
comment on column public.installer_proposals.line_items is
  'JSON array of { id, description, quantity, unit_price_pence }. Totals persisted alongside.';
comment on column public.installer_proposals.vat_rate_bps is
  'Basis points. 0 = 0% (green tech relief default). 2000 = 20% standard.';
comment on column public.installer_proposals.homeowner_token is
  'URL-safe HMAC token for the /p/<token> homeowner page. Minted at first save.';

notify pgrst, 'reload schema';
