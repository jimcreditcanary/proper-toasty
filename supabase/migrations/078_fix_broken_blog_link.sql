-- 078_fix_broken_blog_link.sql
--
-- Broken-link audit found /blog/boiler-upgrade-scheme-explained
-- referenced from air-source-vs-ground-source-heat-pump. The
-- target post exists in the seed but was never published to prod —
-- the sitemap-guides feed doesn't list it. Rather than gate the
-- fix on a decision to publish that post, redirect the link at
-- /guides/bus-application-walkthrough (the closest live equivalent,
-- already indexed + linked from the money pages).
--
-- Idempotent — LIKE match on the exact old href.

begin;

update public.blog_posts
   set content = replace(
     content,
     '<a href="/blog/boiler-upgrade-scheme-explained">',
     '<a href="/guides/bus-application-walkthrough">')
 where content like '%<a href="/blog/boiler-upgrade-scheme-explained">%';

commit;
