// Seeds (or refreshes) a single test installer that we can use to
// drive the F2 claim flow + the booking flow end-to-end without
// touching real MCS data.
//
// What it does:
//
//   1. Upserts an installer row with id 9999001 + email
//      james.fell@creditcanary.co.uk so the email-match bridge picks
//      it up too if the F2 binding hasn't completed yet.
//   2. Clears any existing user_id binding so the row is "claimable"
//      again (handy after a previous test run claimed it).
//   3. Seeds Mon-Sun availability so the booking modal has slots.
//   4. Prints the URLs you'll want to test.
//
// Idempotent — re-run any time to reset the test installer to a known
// state.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/seed-test-installer.ts
//
// (tsx's --env-file flag loads NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY from your local .env.local.)

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const TEST_INSTALLER_ID = 9999001;
const TEST_EMAIL = "james.fell@creditcanary.co.uk";

// Central London — King's Cross. Pick a real UK lat/long that
// matches the postcode so the bounding-box prefilter in findNearby()
// actually returns this installer for nearby homeowner postcodes.
const TEST_POSTCODE = "N1 9AG";
const TEST_LAT = 51.5308;
const TEST_LNG = -0.1238;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — load .env.local first.",
  );
  process.exit(1);
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("→ Seeding test installer", { id: TEST_INSTALLER_ID, email: TEST_EMAIL });

  const row: Database["public"]["Tables"]["installers"]["Insert"] = {
    id: TEST_INSTALLER_ID,
    certification_number: "MCS TEST 0001",
    certification_body: "MCS",
    company_name: "Toasty Test Installer Ltd",
    email: TEST_EMAIL,
    telephone: "020 0000 0001",
    website: "https://example.com/toasty-test",
    address_line_1: "1 Pancras Square",
    address_line_2: "King's Cross",
    address_line_3: null,
    county: "Greater London",
    postcode: TEST_POSTCODE,
    country: "England",
    latitude: TEST_LAT,
    longitude: TEST_LNG,
    bus_registered: true,
    cap_air_source_heat_pump: true,
    cap_ground_source_heat_pump: true,
    cap_water_source_heat_pump: false,
    cap_exhaust_air_heat_pump: false,
    cap_gas_absorption_heat_pump: false,
    cap_solar_assisted_heat_pump: false,
    cap_solar_pv: true,
    cap_battery_storage: true,
    cap_solar_thermal: false,
    cap_biomass: false,
    cap_hydro: false,
    cap_micro_chp: false,
    cap_wind_turbine: false,
    region_london: true,
    region_south_east: true,
    region_eastern: true,
    company_number: "99990001",
    ch_match_confidence: "high",
    reviews_score: 4.7,
    reviews_count: 42,
    source: "seed_script",
    // Wipe the binding so the row is claimable again. We can't
    // include user_id: null in the typed Insert (FK), but the second
    // explicit update below guarantees it's clear.
  };

  const { error: upErr } = await admin
    .from("installers")
    .upsert(row, { onConflict: "id" });
  if (upErr) {
    console.error("✗ upsert failed", upErr.message);
    process.exit(1);
  }

  // Clear any prior claim binding from earlier test runs so the row
  // is in "fresh / unclaimed" state every time we seed.
  const { error: clearErr } = await admin
    .from("installers")
    .update({ user_id: null, claimed_at: null })
    .eq("id", TEST_INSTALLER_ID);
  if (clearErr) {
    console.warn("! couldn't clear claim binding", clearErr.message);
  }

  console.log("✓ installer row upserted");

  // Seed availability — Mon-Sun, 09:00-17:00 (Sat-Sun a bit shorter).
  // Migration 032 / 033 already seed these for every installer in the
  // table, but we re-upsert to be safe in case someone deleted them.
  const availabilityRows: Database["public"]["Tables"]["installer_availability"]["Insert"][] =
    [
      { installer_id: TEST_INSTALLER_ID, day_of_week: 1, start_time: "09:00:00", end_time: "17:00:00" },
      { installer_id: TEST_INSTALLER_ID, day_of_week: 2, start_time: "09:00:00", end_time: "17:00:00" },
      { installer_id: TEST_INSTALLER_ID, day_of_week: 3, start_time: "09:00:00", end_time: "17:00:00" },
      { installer_id: TEST_INSTALLER_ID, day_of_week: 4, start_time: "09:00:00", end_time: "17:00:00" },
      { installer_id: TEST_INSTALLER_ID, day_of_week: 5, start_time: "09:00:00", end_time: "17:00:00" },
      { installer_id: TEST_INSTALLER_ID, day_of_week: 6, start_time: "09:00:00", end_time: "17:00:00" },
      { installer_id: TEST_INSTALLER_ID, day_of_week: 0, start_time: "10:00:00", end_time: "16:00:00" },
    ];

  // Cleanest approach — wipe + re-insert. Ensures we don't leave
  // stale rows from a previous schema.
  await admin
    .from("installer_availability")
    .delete()
    .eq("installer_id", TEST_INSTALLER_ID);
  const { error: availErr } = await admin
    .from("installer_availability")
    .insert(availabilityRows);
  if (availErr) {
    console.error("✗ availability insert failed", availErr.message);
    process.exit(1);
  }
  console.log("✓ availability seeded (Mon-Sun)");

  // Reset any claimed-by user (in case the email was previously bound).
  const { data: existingUser } = await admin
    .from("users")
    .select("id, email, role, credits")
    .ilike("email", TEST_EMAIL)
    .maybeSingle<{
      id: string;
      email: string;
      role: string;
      credits: number;
    }>();
  if (existingUser) {
    console.log("! found pre-existing user with this email", existingUser);
    console.log(
      "  Tip: if you want a fresh F2 claim, delete this auth user from Supabase → Authentication.",
    );
  } else {
    console.log("✓ no pre-existing user — F2 signup will be fresh");
  }

  // Verify the row really exists by reading it back. If for some
  // reason the upsert silently dropped (RLS, role, project mismatch,
  // anything weird), we want a noisy failure here rather than the
  // user confusedly hitting a 404 on the prefill URL.
  const { data: verify, error: verifyErr } = await admin
    .from("installers")
    .select("id, company_name, company_number, email, user_id")
    .eq("id", TEST_INSTALLER_ID)
    .maybeSingle();
  if (verifyErr || !verify) {
    console.error(
      "✗ verification read failed — the row may not have persisted:",
      verifyErr?.message ?? "no row returned",
    );
    process.exit(1);
  }
  console.log("✓ verified installer row in DB", verify);

  console.log("\n──────────────── Done ────────────────\n");
  console.log("Test it:");
  console.log(`  Direct claim URL:  https://www.propertoasty.com/installer-signup?id=${TEST_INSTALLER_ID}`);
  console.log(`  Search-first URL:  https://www.propertoasty.com/installer-signup`);
  console.log(`  (search for "Toasty Test" or company number 99990001)`);
  console.log(`\n  Test installer:    Toasty Test Installer Ltd`);
  console.log(`  Email on file:     ${TEST_EMAIL}`);
  console.log(`  Postcode:          ${TEST_POSTCODE}`);
  console.log(
    `\n  After F2 signup + email confirm, you'll land on /installer.`,
  );
  console.log(
    `  If you want to test booking, run /check from a London-ish postcode\n  (NW1 / N1 / EC1) so this installer shows in the directory.`,
  );
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
