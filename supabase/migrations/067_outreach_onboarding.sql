-- Phase 5 onboarding storage:
--
--   installers.bio                       — free-text "About us" para
--                                         used on the installer card +
--                                         AI blog-post drafting context
--   outreach_recipients.blog_draft_markdown — Claude-drafted post,
--                                         persisted so the installer
--                                         can review-edit across
--                                         multiple sessions before
--                                         approving
--   outreach_recipients.questions_answers  — the 6 interview answers
--                                         (jsonb {1..6: text}). Kept
--                                         for audit + so the draft
--                                         can be regenerated
--   blog_posts.installer_id              — links a published post to
--                                         the installer who wrote it
--                                         (NULL for pre-existing
--                                         editorial posts)
--   blog_posts.is_installer_profile      — flag so the blog index
--                                         can separate
--                                         installer-authored content
--                                         from editorial

ALTER TABLE public.installers
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.installers.bio IS
  'Free-text "About us" paragraph set by the installer during onboarding. Used on installer cards + as context for the AI-drafted blog post.';

ALTER TABLE public.outreach_recipients
  ADD COLUMN IF NOT EXISTS blog_draft_markdown text,
  ADD COLUMN IF NOT EXISTS questions_answers jsonb;

COMMENT ON COLUMN public.outreach_recipients.blog_draft_markdown IS
  'Claude-drafted blog post for the questions/interview ask. Persisted so review-edits survive session breaks. NULL until the questions step runs.';

COMMENT ON COLUMN public.outreach_recipients.questions_answers IS
  'JSON object {q1: ..., q2: ..., ..., q6: ...} of the 6 interview answers. Stored for audit + so the draft can be regenerated if the installer rejects the first pass.';

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS installer_id bigint
    REFERENCES public.installers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_installer_profile boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.blog_posts.installer_id IS
  'When non-NULL, this post was authored by an installer via the onboarding interview. NULL for editorial posts.';

COMMENT ON COLUMN public.blog_posts.is_installer_profile IS
  'True for posts coming out of the installer-onboarding interview. Lets the blog index segment editorial vs installer-authored content + drive separate sitemap groups.';

CREATE INDEX IF NOT EXISTS blog_posts_installer_idx
  ON public.blog_posts (installer_id)
  WHERE installer_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
