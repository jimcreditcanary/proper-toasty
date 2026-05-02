-- Stash the per-lead report-share URL on the installer_leads row
-- so we can surface it consistently across:
--   - the installer leads inbox (View report button per accepted card)
--   - the installer's calendar invite description
--   - the post-accept landing page (/lead/accepted)
--
-- We mint the token in the acknowledge route at accept time and
-- write the absolute URL here. Storing the URL (rather than just
-- the token id) means the credits/installer/leads page reads it
-- straight from the row without needing to know how to compose the
-- public path — handy if /r/[token] ever moves.

alter table public.installer_leads
  add column if not exists installer_report_url text;

comment on column public.installer_leads.installer_report_url is
  'C4-aligned: report-share URL minted at accept time so the installer can prep before the visit. NULL until accepted.';

notify pgrst, 'reload schema';
