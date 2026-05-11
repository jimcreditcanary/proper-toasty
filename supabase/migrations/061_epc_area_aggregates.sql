-- 061_epc_area_aggregates.sql
--
-- Rollup table backing every programmatic geographic page (towns,
-- postcode districts, local authorities, archetypes). One row per
-- (scope, scope_key) combination, with all the numbers we'd
-- otherwise compute live on every page render.
--
-- WRITE PATH: scripts/epc-search/build-town-aggregates.ts walks
-- every town in the seed, fetches EPC search rows from the GOV.UK
-- API, computes the rollups + upserts here. Run periodically (the
-- bulk EPC dump refreshes monthly).
--
-- READ PATH: /heat-pumps/[town-slug] + /solar-panels/[town-slug]
-- select one row per page render. Cheap; primary key + (scope,
-- scope_key) index covers it.
--
-- PROTECT FROM WIPES: this table holds expensively-acquired EPC
-- aggregates (every refresh = ~100s of API calls per town). Add
-- 'epc_area_aggregates' to the keep-list of any future wipe /
-- truncate script, alongside 'installers', 'blog_posts',
-- 'admin_settings', 'api_cache'.

create table if not exists public.epc_area_aggregates (
  id bigserial primary key,
  -- One of: 'town', 'postcode_district', 'local_authority',
  -- 'archetype', 'archetype_x_la'. New scopes get added as
  -- programmatic generators land.
  scope text not null
    check (scope in ('town', 'postcode_district', 'local_authority', 'archetype', 'archetype_x_la')),
  -- Slug-shaped key within the scope. For 'town': the page slug
  -- ('sheffield', 'bristol'). For 'archetype': 'victorian-terrace'.
  scope_key text not null,
  -- Display name shown on the page ('Sheffield', 'Bristol').
  display_name text not null,
  -- BUS-eligibility gate. The page surfaces England/Wales-specific
  -- grant copy; Scotland + NI get a different scheme.
  country text not null
    check (country in ('England', 'Wales', 'Scotland', 'Northern Ireland')),
  -- Coarser geographic context for display + cross-linking
  -- (e.g. "Sheffield, South Yorkshire").
  region text,
  county text,
  -- Centroid coordinates for the "near you" cross-link and any
  -- future map-aware content. Optional — pure-data scopes
  -- ('archetype') have no centroid.
  lat double precision,
  lng double precision,
  -- The rollup payload itself. JSONB rather than per-field columns
  -- because:
  --   1. The shape is still evolving (pilot uses band distribution
  --      only; bulk-dump scale-up adds property type, floor area,
  --      heating cost, etc.)
  --   2. We never query INTO the JSON — only the whole row read by
  --      slug. No index needed on internal fields.
  --   3. Schema-evolution cost is just an upsert, not an ALTER TABLE.
  data jsonb not null default '{}',
  -- Pulled out of `data` for indexability — every page renderer
  -- gates on sample_size before rendering, and the build-time
  -- validator filters the sitemap by it.
  sample_size int not null default 0,
  -- Build-time validator toggles this off when the page fails
  -- quality gates (sample_size too small, content too thin, etc.).
  -- noindex'd at the page level + excluded from sitemap-towns.xml.
  indexed boolean not null default false,
  -- Human-readable reason for noindex (e.g. "sample_size=12 below
  -- 50 minimum"). Surfaces in admin tooling for debugging.
  index_reason text,
  refreshed_at timestamptz not null default now(),
  -- When the rollup came from a bulk EPC dump rather than live
  -- search, the dump's lodgement-cutoff date goes here for
  -- provenance. Null for live-search rollups.
  source_dump_date text,
  -- Idempotent upsert key — script writes with onConflict(scope,
  -- scope_key).
  unique (scope, scope_key)
);

-- Sitemap filter: SELECT WHERE scope='town' AND indexed=true.
create index if not exists epc_area_aggregates_scope_indexed_idx
  on public.epc_area_aggregates (scope, indexed)
  where indexed = true;

-- Page render: SELECT WHERE scope_key=$1 AND scope=$2.
create index if not exists epc_area_aggregates_scope_key_idx
  on public.epc_area_aggregates (scope_key);

comment on table public.epc_area_aggregates is
  'Rollup data backing programmatic geographic pages. One row per (scope, scope_key). NEVER wipe — expensive to rebuild.';
