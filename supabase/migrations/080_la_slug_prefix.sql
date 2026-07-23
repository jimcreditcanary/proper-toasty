-- 080_la_slug_prefix.sql
--
-- Renames existing local-authority scope_keys to the `la-` prefixed
-- form the route resolvers require.
--
-- Root cause (fixed in code in the same PR):
--   scripts/epc-search/build-town-aggregates.ts wrote LA rows with
--   `scope_key = laSlugFromCouncilName(town.councilName)` — no prefix.
--   The /heat-pumps/[town-slug] + /solar-panels/[town-slug] +
--   /heat-pump-installers/[area] + /solar-panel-installers/[area]
--   resolvers only take the LA branch when the slug starts with
--   `la-`. Un-prefixed rows 404 at request time and pollute the
--   sitemap.
--
-- Ahrefs found 24 URLs 404ing = 6 LAs × 4 route templates:
--   bath-and-north-east-somerset
--   bournemouth-christchurch-and-poole
--   bristol-city-of
--   kingston-upon-hull-city-of
--   newport
--   west-northamptonshire
--
-- Idempotent — `where not scope_key like 'la-%'` guards against
-- re-running after the rename lands.

begin;

update public.epc_area_aggregates
   set scope_key = 'la-' || scope_key
 where scope = 'local_authority'
   and scope_key not like 'la-%';

commit;
