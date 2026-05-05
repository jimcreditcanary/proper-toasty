-- Onboarding-checklist dismissal flag.
--
-- Until now the four-step welcome card on /installer auto-hid only
-- when every step was complete. Installers who'd done 3 of 4 (e.g.
-- they've set availability + topped up + sent their first link, but
-- haven't sent a quote yet) were stuck looking at the same card on
-- every visit even though they understood the surface.
--
-- New column captures the installer's choice to hide it. ISO
-- timestamp rather than a boolean so we have an audit trail (when
-- they dismissed) and can revive it if we ship a new step later.
-- Setting null re-shows the card.

alter table public.users
  add column if not exists installer_onboarding_dismissed_at timestamptz;

comment on column public.users.installer_onboarding_dismissed_at is
  'When the installer dismissed the welcome / onboarding checklist on /installer. Null = show. Timestamp = hide. Toggled via /api/installer/onboarding/dismiss.';

notify pgrst, 'reload schema';
