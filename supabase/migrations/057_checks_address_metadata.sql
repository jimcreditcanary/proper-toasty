-- OS Places API returns ~20 useful fields per address row beyond the
-- ones we already denormalise (uprn, udprn, line1/2, postcode, lat,
-- lng, country). Rather than fan out into 20 new columns — most of
-- which we'll only consume in the installer report — stash the rich
-- payload as a single JSONB blob.
--
-- Shape (TypeScript-side mirror lives in src/lib/schemas/postcoder.ts
-- as the AddressMetadata type):
--
--   {
--     "source": "os-places" | "postcoder",
--     "classificationCode": "RD06",                -- residential? commercial? flat? bungalow?
--     "classificationDescription": "Residential / Self-Contained Flat",
--     "countryCode": "E92000001",                  -- E92 = England, W92 = Wales
--     "localCustodianCode": 4715,                  -- maps 1:1 to the LA EPC.council
--     "wardCode": "E05001349",
--     "parishCode": "E04007921",
--     "parentUprn": "100071234567",                -- block UPRN when this row is a flat
--     "topographyLayerToid": "osgb1000034141123",  -- pivot into OS MasterMap topography
--     "logicalStatusCode": 1,                      -- 1 = approved, 8 = historical
--     "deliveryPointSuffix": "1A",                 -- distinguishes 1A from 1B
--     "blpuStateCode": 2,
--     "lastUpdateDate": "2024-11-20",
--     "raw": { /* full OS Places DPA row */ }
--   }
--
-- Indexed on classification_code via a generated expression so admin
-- queries can filter "all flats" / "non-residential" without a full
-- table scan once the column has data.
alter table public.checks
  add column if not exists address_metadata jsonb;

create index if not exists checks_address_classification_code_idx
  on public.checks ((address_metadata->>'classificationCode'))
  where address_metadata is not null;

create index if not exists checks_address_parent_uprn_idx
  on public.checks ((address_metadata->>'parentUprn'))
  where address_metadata is not null
    and (address_metadata->>'parentUprn') is not null;

comment on column public.checks.address_metadata is
  'Rich OS Places (or fallback Postcoder) metadata captured at address-pick time. See migration 057 for the schema.';
