-- Sponsored listings + installer logos.
--
-- ── sponsored_until ─────────────────────────────────────────────
-- Boost-style paid placement on the public directory pages. When
-- > now(), the installer floats to the top of distance-sorted lists
-- AND accepting a lead debits 10 credits instead of 5. NULL or
-- <= now() means regular organic placement (5 credits/lead).
--
-- Why a timestamp not a boolean: auto-expiry. The installer picks
-- a boost duration (7 / 30 days), we set sponsored_until = now() +
-- duration, and the row silently demotes back to organic when the
-- timestamp drifts past now(). No "we forgot to disable" bugs and
-- no cron job needed.
--
-- The economic deal: installer doubles per-lead cost in exchange
-- for top-of-list placement. No separate boost fee — the only
-- debit happens when an accept fires. If sponsored placement
-- doesn't generate accepts, they pay nothing extra.
--
-- ── logo_url ────────────────────────────────────────────────────
-- Public URL of the installer's uploaded logo. Used for the avatar
-- slot on installer cards (replaces the initials fallback) + on
-- the report's book-visit tab. NULL = render initials.
--
-- Stored in the public `installer-logos` storage bucket. We keep
-- the URL on the row rather than reconstructing it client-side so
-- we can swap storage backends later without a code change.
--
-- ── installer-logos bucket ──────────────────────────────────────
-- Public read (logos are by definition shown to the world on
-- directory pages). Writes go through an admin-authenticated API
-- route, never directly from the browser, so we don't need
-- end-user storage RLS policies — service-role inserts/updates
-- are unconditional.
--
-- File size cap: 2 MiB. Allowed MIME types: png/jpeg/webp/svg+xml.
-- Larger or different formats fail at the API tier with a clear
-- error rather than landing in the bucket.

ALTER TABLE public.installers
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz,
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.installers.sponsored_until IS
  'Sponsored placement expiry timestamp. When > now(), installer floats to top of directory pages and per-lead cost is 10 credits instead of 5. NULL or past = organic.';

COMMENT ON COLUMN public.installers.logo_url IS
  'Public URL of the installer logo (stored in installer-logos bucket). NULL = initials avatar fallback.';

-- Partial index for the directory ordering query — most rows have
-- NULL here so a partial index is small + cache-friendly.
CREATE INDEX IF NOT EXISTS installers_sponsored_until_idx
  ON public.installers (sponsored_until)
  WHERE sponsored_until IS NOT NULL;

-- Public bucket for installer logos. ON CONFLICT keeps this
-- migration idempotent across local + remote runs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'installer-logos',
  'installer-logos',
  true,
  2097152, -- 2 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Per-lead accept cost. Populated at acknowledge time so the
-- installer-billing usage page can SUM actual debits rather than
-- assume the constant 5. Sponsored installers debit 10; everyone
-- else debits 5. Legacy rows stay NULL — usage queries COALESCE to
-- 5 for historical reads.
ALTER TABLE public.installer_leads
  ADD COLUMN IF NOT EXISTS accept_cost_credits integer;

COMMENT ON COLUMN public.installer_leads.accept_cost_credits IS
  'Credits debited at lead acceptance. 5 = organic, 10 = sponsored, NULL = legacy / pre-survey path (zero debit).';
