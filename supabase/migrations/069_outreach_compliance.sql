-- Phase 8 compliance hardening:
--
--   soft_bounce_count          — counter incremented on each soft
--                                bounce webhook. Recipient gets
--                                suppressed once it hits 3.
--
--   spot_counter_sent_at       — stamped when the side-channel
--                                spot-counter email fires (2 days
--                                after a click without signup).
--                                Prevents repeats.
--
--   next_send_template_alias   — when set, the send-queue uses this
--                                template alias instead of looking
--                                up by current_step. After the send,
--                                the column gets cleared + state is
--                                NOT downgraded. Used for one-off
--                                side-channel sends (spot-counter
--                                today; could be used for ad-hoc
--                                broadcasts later).

ALTER TABLE public.outreach_recipients
  ADD COLUMN IF NOT EXISTS soft_bounce_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spot_counter_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_send_template_alias text;

COMMENT ON COLUMN public.outreach_recipients.soft_bounce_count IS
  'Count of soft bounces (SoftBounce / Transient) in the last 7 days. Incremented in the webhook handler; recipient is moved to suppression at 3.';

COMMENT ON COLUMN public.outreach_recipients.spot_counter_sent_at IS
  'When the side-channel outreach-spot-counter email was sent. NULL = never sent. The follow-up scheduler will not re-queue if non-NULL.';

COMMENT ON COLUMN public.outreach_recipients.next_send_template_alias IS
  'Override for the send-queue template selection. When set, the next send uses this alias instead of the sequence row. Cleared on successful send. Used for side-channel sends that bypass the normal step machinery (spot-counter today).';

NOTIFY pgrst, 'reload schema';
