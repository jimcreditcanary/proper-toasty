-- 077_blog_bylines_and_h2_questions.sql
--
-- Two SEO cleanups on public.blog_posts:
--
-- (1) Bylines. Every blog post shipped with author='Propertoasty' (a
--     couple with the pre-fork 'WhoAmIPaying' default). The audit
--     flagged that Google + AI answer engines score named-author
--     E-E-A-T signals higher than org-authored posts, and the blog
--     [slug] page already resolves Article.author.@id to the Person
--     entity for the default author. Switching the visible byline
--     to a real name closes the last gap.
--
--     Currently only one author on the platform (Jim Fell). When
--     contributors ship we'll swap to a per-slug FK; today a name
--     string is enough for the code to look up the author registry
--     entry and render the byline as a link to /authors/jim-fell.
--
-- (2) H2 rephrasing. The blog-batch-2 seed shipped four "The X
--     question" H2s in do-heat-pumps-work-in-old-houses (radiator,
--     insulation, sizing) + one in another post (hydrogen). The
--     audit specifically named those as targets for the H2-as-
--     question pass — rephrase to real questions so AI answer
--     engines (Perplexity, ChatGPT Search) treat them as
--     answerable-question anchors.
--
-- Idempotent — safe to re-run. Uses author=... equality so future
-- posts with the new byline aren't touched.

begin;

-- (1) Bylines: 'Propertoasty' / 'WhoAmIPaying' → 'Jim Fell'.
update public.blog_posts
   set author = 'Jim Fell'
 where author in ('Propertoasty', 'WhoAmIPaying');

-- (2) H2 rephrasing on do-heat-pumps-work-in-old-houses.
update public.blog_posts
   set content = replace(content,
     '<h2>The radiator question</h2>',
     '<h2>Do I need bigger radiators for a heat pump?</h2>')
 where slug = 'do-heat-pumps-work-in-old-houses';

update public.blog_posts
   set content = replace(content,
     '<h2>The insulation question</h2>',
     '<h2>How much insulation does an old house need before a heat pump?</h2>')
 where slug = 'do-heat-pumps-work-in-old-houses';

update public.blog_posts
   set content = replace(content,
     '<h2>The sizing question</h2>',
     '<h2>What size heat pump does an old house need?</h2>')
 where slug = 'do-heat-pumps-work-in-old-houses';

-- (3) H2 rephrasing on the post carrying "The hydrogen question".
--     Not slug-pinned because it isn't in the same post; the string
--     is distinctive enough to be safe as a repo-wide replace.
update public.blog_posts
   set content = replace(content,
     '<h2>The hydrogen question</h2>',
     '<h2>Will hydrogen boilers replace gas boilers in UK homes?</h2>')
 where content like '%<h2>The hydrogen question</h2>%';

commit;
