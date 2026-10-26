-- Force-password-change flag for admin-set temporary passwords.
--
-- Flow:
--   1. Admin uses /admin/users row action "Set new password" → the
--      API generates a random password, writes it to auth.users via
--      the admin SDK, and flips this flag to true on public.users.
--   2. On the user's next login (fresh JWT), the portal layouts
--      (admin / dashboard / installer) see the flag and redirect to
--      /auth/change-password.
--   3. The change-password page sets a new password via the normal
--      Supabase updateUser call, then clears this flag.
--
-- Default false so existing users are unaffected.

alter table public.users
  add column if not exists must_change_password boolean not null default false;

comment on column public.users.must_change_password is
  'When true, the user is forced to change their password on next request. Set by the admin "Set new password" flow; cleared when the user picks a new password at /auth/change-password.';

notify pgrst, 'reload schema';
