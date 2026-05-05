-- Guest-friendly check persistence.
--
-- Until now, public.checks required a user_id (not null FK to
-- auth.users). The wizard runs anonymously by default — only logged
-- in homeowners and authenticated installer pre-survey portals
-- have a session. Pre-survey homeowners who click a magic link have
-- NO auth at all; they're identified by the token in the URL and
-- only get persisted as a homeowner_leads row at the end of the
-- flow.
--
-- That meant zero check rows ever got written, which is why
-- /admin/reports has been blank and the floorplan metrics from
-- migration 4e44aea had nowhere to land.
--
-- Three changes here:
--
-- 1. user_id is now NULLABLE. A check can be entirely anonymous
--    until lead capture (or sign-up) wires it to an identity.
--
-- 2. New `client_session_id text` column. The wizard generates a
--    UUID at start (kept in localStorage alongside the rest of
--    wizard state) and sends it on every upsert so we can keep
--    finding the same row across page reloads. Indexed for fast
--    lookups; not unique because the same browser can run multiple
--    checks back-to-back (one per address tried).
--
-- 3. New `homeowner_lead_id uuid` column. Set when /api/leads/capture
--    creates a lead, so admin queries can join checks ↔ leads ↔
--    installer_leads in a straight line. on delete set null so
--    a lead deletion doesn't cascade-kill the check; we want the
--    raw analysis preserved.
--
-- RLS unchanged — the existing "Users read/insert/update own checks
-- where auth.uid() = user_id" policies still hold for authenticated
-- users. Guest rows (user_id is null) aren't readable via RLS at all,
-- which is intentional: only the service-role admin client reaches
-- them, via /api/checks/upsert and /admin/reports.

-- ─── Drop NOT NULL on user_id ──────────────────────────────────────
alter table public.checks
  alter column user_id drop not null;

-- ─── client_session_id ─────────────────────────────────────────────
alter table public.checks
  add column if not exists client_session_id text;

-- Partial index — only meaningful for guest rows (user_id is null).
-- For authenticated users the user_id index already covers lookups.
create index if not exists checks_client_session_id_idx
  on public.checks (client_session_id)
  where client_session_id is not null;

comment on column public.checks.client_session_id is
  'Opaque UUID minted by the wizard on first load (kept in localStorage). Lets the upsert API find the same draft check across page reloads when no auth.uid() is available. Null for legacy rows + authenticated-from-the-start checks.';

-- ─── homeowner_lead_id ─────────────────────────────────────────────
alter table public.checks
  add column if not exists homeowner_lead_id uuid
    references public.homeowner_leads(id) on delete set null;

create index if not exists checks_homeowner_lead_id_idx
  on public.checks (homeowner_lead_id)
  where homeowner_lead_id is not null;

comment on column public.checks.homeowner_lead_id is
  'Set when /api/leads/capture creates the homeowner_leads row at end of wizard. Lets admin queries join check → lead → installer_lead in a single hop. NULL while the check is still anonymous / abandoned.';

-- ─── Denormalised floorplan headline metrics ───────────────────────
-- The full per-room breakdown lives inside check_results.floorplan_analysis
-- as JSONB. These columns surface the four headline numbers (room
-- count, floor count, total area in m² + sq ft) directly on the checks
-- row so admin queries don't need a JSONB path expression.
--
-- All nullable — they only populate when the floorplan extraction
-- pass actually reads dimension labels off the image. A sketch with
-- no labels stays null.

alter table public.checks
  add column if not exists room_count integer
    check (room_count is null or room_count >= 0);

alter table public.checks
  add column if not exists floors_count integer
    check (floors_count is null or floors_count >= 1);

alter table public.checks
  add column if not exists total_area_m2 numeric(10, 2)
    check (total_area_m2 is null or total_area_m2 > 0);

alter table public.checks
  add column if not exists total_area_sqft numeric(10, 2)
    check (total_area_sqft is null or total_area_sqft > 0);

comment on column public.checks.room_count is
  'Number of rooms detected from labelled floorplan text. Populated by /api/floorplan/extract-metrics. NULL if the floorplan had no labels.';
comment on column public.checks.floors_count is
  'Distinct floors visible on the floorplan (1 for a flat, 2 typical UK semi). Populated by /api/floorplan/extract-metrics.';
comment on column public.checks.total_area_m2 is
  'Total floor area in m². NULL when not labelled / not summable from per-room sizes.';
comment on column public.checks.total_area_sqft is
  'Total floor area in sq ft. Mirrors total_area_m2 with the UK-conventional unit.';

-- ─── Reload PostgREST schema ────────────────────────────────────────
notify pgrst, 'reload schema';
