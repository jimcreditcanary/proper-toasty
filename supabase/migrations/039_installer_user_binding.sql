-- F2 — Installer claim flow. Bind an MCS installer record to a real
-- Propertoasty user account so we know who's allowed to accept leads
-- on its behalf and whose credit balance gets debited.
--
-- Why a hard FK column rather than the email-match bridge from
-- migration 028 onwards? Two reasons:
--
--   1. Installers' billing email and the directory email aren't always
--      the same. Plenty of company entries on mcscertified.com use the
--      generic info@ address; the actual decision-maker may want to
--      log in with their own email. Email-match doesn't handle that.
--
--   2. Email-match is one-shot and silent. If the user later changes
--      their email in /account, the link breaks invisibly. A FK
--      survives.
--
-- The bind is created post-confirmation in src/app/auth/callback —
-- the signup form puts the chosen installer ID into user_metadata,
-- and the callback CAS-updates installers.user_id so two people
-- attempting the same claim race cleanly.

-- Add the columns. NULL until claimed.
alter table public.installers
  add column if not exists user_id uuid
    references public.users(id) on delete set null;

alter table public.installers
  add column if not exists claimed_at timestamptz;

-- Partial index so the lead-accept binding lookup
-- (`select … where user_id = $1`) hits an index. The vast majority
-- of rows will be NULL until the userbase grows, so partial keeps it
-- tiny.
create index if not exists installers_user_id_idx
  on public.installers (user_id)
  where user_id is not null;

-- One installer per user — at most one claim. If the same email
-- somehow ends up claiming two installers (admin manual override,
-- merger, etc.) we'll need explicit support tooling, not a silent
-- second binding.
create unique index if not exists installers_user_id_unique
  on public.installers (user_id)
  where user_id is not null;

-- Reload PostgREST so the new columns appear in the API immediately.
notify pgrst, 'reload schema';

comment on column public.installers.user_id is
  'F2: bound Propertoasty user account (post-claim). NULL until the installer signs up via /installer-signup and confirms their email.';
comment on column public.installers.claimed_at is
  'F2: timestamp the installer.user_id binding completed (auth callback).';
