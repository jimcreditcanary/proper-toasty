-- Fix: lead_impressions.verification_id had no ON DELETE rule, which meant
-- cascade-deleting a user (auth.users → public.users → verifications)
-- blocked on this FK and the whole delete failed with SQLSTATE 23503.
--
-- lead_impressions is an analytics record of a wizard journey; it outlives
-- the verification it points at, so SET NULL is the right rule.

alter table public.lead_impressions
  drop constraint if exists lead_impressions_verification_id_fkey;

alter table public.lead_impressions
  add constraint lead_impressions_verification_id_fkey
  foreign key (verification_id)
  references public.verifications(id)
  on delete set null;
