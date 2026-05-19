-- Use Mustachio-style conditional blocks around first-name
-- personalisation in subjects so missing names don't produce
-- "Quick question, " with a trailing comma + space.
--
-- The send-queue route now renders subject merge variables
-- server-side before passing to Postmark (otherwise placeholders
-- inside a substituted `{{subject}}` value leak through as literal
-- text — that was the m068 bug). The renderer supports
-- `{{#var}}…{{/var}}` which keeps the inner block only when `var`
-- has a non-empty value.
--
-- Patterns:
--   `Quick question{{#first_name}}, {{first_name}}{{/first_name}}`
--     → "Quick question, James" when we know it
--     → "Quick question" when we don't
--
-- step-0 + step-1 (initial + resend-not-opened) carry first_name
-- variants today — both updated. Other steps don't reference
-- first_name in the subject.

update public.outreach_email_sequence
   set subject_variants = array[
     'Quick question{{#first_name}}, {{first_name}}{{/first_name}}',
     '{{company_name}} — a quick question',
     'Spotted you on the MCS list'
   ]
 where step_number = 0;

update public.outreach_email_sequence
   set subject_variants = array[
     'Re: Quick question{{#first_name}}, {{first_name}}{{/first_name}}',
     'Following up — {{company_name}}',
     'One more thought'
   ]
 where step_number = 1;

notify pgrst, 'reload schema';
