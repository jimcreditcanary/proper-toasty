// One-off: fire the social agent against prod with a forced pillar
// and dump the JSON response. Reads CRON_SECRET from .env.local via
// the safe loader so the token never lands in shell history.
//
// Usage:
//   npx tsx scripts/dev/smoke-social-agent.ts [pillar]
//   pillar defaults to "heat_pump" — one of:
//     heat_pump | solar | plug_in_solar | blog

import "@/lib/dev/load-env";

const pillar = process.argv[2] ?? "heat_pump";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET not set — check .env.local");
  process.exit(1);
}

const url = `https://www.propertoasty.com/api/cron/social-agent?pillar=${encodeURIComponent(
  pillar,
)}`;

async function main() {
  console.log(`POST ${url.replace(secret!, "…")}`);
  const started = Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const body = await res.text();
  console.log(`\nHTTP ${res.status} in ${elapsed}s\n`);
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
