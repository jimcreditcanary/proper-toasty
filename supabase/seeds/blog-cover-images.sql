-- Backfill cover_image on the 10 launch posts.
--
-- The original blog-launch.sql seed predates the cover-image
-- rendering on /blog/[slug] — every post inherits the home-page
-- hero by default, but explicitly setting it (a) makes the
-- relationship visible in the data, and (b) means a future
-- "swap covers per post" job already has rows to update.
--
-- All posts get the same /hero-uk-home.jpg for now. Replace
-- per-post via the admin blog manager (or a follow-up SQL run)
-- when you have category-specific photography.

update public.blog_posts
   set cover_image = '/hero-uk-home.jpg',
       updated_at  = now()
 where slug in (
   'is-a-heat-pump-worth-it-uk',
   'heat-pump-cost-uk-2026',
   'will-solar-panels-work-on-my-house',
   'are-solar-panels-worth-it-uk',
   'pay-cash-or-finance-heat-pump',
   'boiler-upgrade-scheme-explained',
   'what-size-heat-pump-do-i-need',
   'how-long-does-heat-pump-installation-take',
   'is-a-home-battery-worth-it',
   'how-to-choose-mcs-installer'
 );
