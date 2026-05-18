-- Make the step-0 subject variants tier-neutral.
--
-- m065 seeded subject variants for the initial-send step that
-- included "{{company_name}} — founder spots". Reads fine for
-- founder-tier recipients, jarring + misleading for early-access
-- + standard-tier recipients (they're getting the SAME subject
-- variants because subject lives on the sequence row, which is
-- shared across all three tier templates at step 0).
--
-- Replacing with three tier-neutral variants. Same A/B-test
-- coverage; works across all three tier templates.

update public.outreach_email_sequence
   set subject_variants = array[
     'Quick question, {{first_name}}',
     '{{company_name}} — a quick question',
     'Spotted you on the MCS list'
   ]
 where step_number = 0;

notify pgrst, 'reload schema';
