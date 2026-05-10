-- ─── floorplan_uploads ───────────────────────────────────────────────
--
-- Backs the new upload-only flow (`/upload` → extract → `/report/[id]`).
-- Sits parallel to public.checks: that table powers the legacy 7-step
-- wizard which combines EPC + Solar + manual floorplan annotations,
-- this one powers the upload-only path which produces a single JSON
-- extract from a vision-model call.
--
-- One row per upload. The `extract` jsonb column matches
-- src/lib/schemas/floorplan-extract.ts → FloorplanExtractSchema. We
-- store the full JSON rather than columnising fields because:
--   - the contract is iterating fast
--   - the renderer reads the whole blob into a typed object anyway
--   - jsonb GIN indexes give us per-key search if/when we need it
--
-- Image lifecycle: the original image lives in the existing
-- `floorplans` storage bucket via image_object_key. Same 90-day
-- retention as today; deletion still goes through the existing
-- bucket-level cleanup. image_hash is sha256 hex of the post-resize
-- bytes — used for dedupe + triage when an extraction fails (we
-- can correlate failures to the same image across multiple uploads).
--
-- No user_id FK on insert — the v1 path is anonymous (no auth gate
-- on /upload). Auth wires in via a later migration when we tie
-- uploads to homeowner accounts.

create table public.floorplan_uploads (
  id uuid primary key default gen_random_uuid(),
  -- Optional: only set when the uploader is signed in. Plain users
  -- shouldn't be required to authenticate to run a check.
  user_id uuid references public.users(id) on delete set null,

  -- Image audit + triage.
  image_object_key text,                    -- path in storage; null after retention purge
  image_hash text,                          -- sha256 hex of post-resize bytes
  image_bytes integer,                      -- file size for triage
  image_mime text,                          -- 'image/png' / 'image/jpeg' (PDF in v2)

  -- Lifecycle. Mirrors checks.status semantics so future tooling
  -- can union the two tables.
  status text not null default 'extracting'
    check (status in ('extracting', 'complete', 'failed')),
  -- When status='failed' this carries the surfaceable reason.
  failure_reason text,
  -- Number of model retries spent on this row — capped at 1 today
  -- (one retry on schema-validation failure per the spec).
  attempts integer not null default 0,

  -- The validated JSON. Only populated when status='complete'.
  -- Schema: src/lib/schemas/floorplan-extract.ts
  extract jsonb,

  -- Model attribution + token attribution for the cost ledger.
  model text,                               -- e.g. 'claude-sonnet-4-7'
  input_tokens integer,
  output_tokens integer,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Index for the homeowner report page lookup (id-based, server-rendered).
-- The primary key already covers it; explicit comment for posterity.

-- Failure triage: find every failed extraction sharing the same image
-- so we can deduplicate retry analysis.
create index floorplan_uploads_image_hash_idx
  on public.floorplan_uploads (image_hash)
  where image_hash is not null and status = 'failed';

-- Recent uploads first for the admin triage view.
create index floorplan_uploads_created_at_idx
  on public.floorplan_uploads (created_at desc);

-- Per-user history for the future authenticated path.
create index floorplan_uploads_user_id_idx
  on public.floorplan_uploads (user_id)
  where user_id is not null;

-- RLS: the v1 anonymous path means most rows have user_id=null.
-- Reads go through the service-role admin client (the /report/[id]
-- page is server-rendered + does its own ownership check on
-- user_id when present). Writes only ever happen via the upload
-- + extract API routes, which are server-side. Closed RLS keeps
-- the table off the PostgREST surface entirely.
alter table public.floorplan_uploads enable row level security;

-- Updated_at trigger — same convention as the rest of the schema.
create or replace function public.touch_floorplan_uploads_updated_at()
returns trigger language plpgsql as $$
begin
  -- We only have completed_at on this table (not updated_at) because
  -- the row is effectively immutable once status='complete'. This
  -- function is therefore a no-op placeholder for future expansion.
  return new;
end;
$$;

comment on table public.floorplan_uploads is
  'V2 upload-only flow: one row per floorplan upload + extract.';
comment on column public.floorplan_uploads.extract is
  'Validated JSON matching src/lib/schemas/floorplan-extract.ts.';

-- ─── installer_leads.floorplan_upload_id ─────────────────────────────
--
-- Optional FK so an installer-facing lead can carry the new
-- upload-style extract alongside (or instead of) the legacy
-- analysis_snapshot. Site-brief renders the new "Site Visit Prep"
-- section when this is set; falls back to the existing legacy
-- sections when it's null.

alter table public.installer_leads
  add column if not exists floorplan_upload_id uuid
    references public.floorplan_uploads(id) on delete set null;

create index if not exists installer_leads_floorplan_upload_id_idx
  on public.installer_leads (floorplan_upload_id)
  where floorplan_upload_id is not null;
