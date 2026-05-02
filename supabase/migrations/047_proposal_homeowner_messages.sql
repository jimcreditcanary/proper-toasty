-- Homeowner-side messages on a quote.
--
-- The homeowner can leave a question / callback request on the
-- /p/<token> page without having to accept or decline. We store
-- each message as an entry in a jsonb array on the existing
-- installer_proposals row — no separate table; this is a
-- lightweight inbox tied to a single quote.
--
-- Shape: [{ id, body, sent_at, channel? }, ...]
--   - id        client-side stable string for React keys
--   - body      free text, server caps to 2000 chars
--   - sent_at   ISO timestamp set on the server
--   - channel   optional: "message" | "callback" — distinguishes
--               "I have a question" from "please call me back"
--
-- Each new message also fires an email to the installer (via
-- /api/proposals/[token]/message). We surface the running list on
-- the installer-side proposal viewer so they can see context
-- before replying.

alter table public.installer_proposals
  add column if not exists homeowner_messages jsonb not null default '[]'::jsonb;

comment on column public.installer_proposals.homeowner_messages is
  'I4 follow-on: array of { id, body, sent_at, channel? } — homeowner messages left on /p/<token>. Installer is emailed each one.';

notify pgrst, 'reload schema';
