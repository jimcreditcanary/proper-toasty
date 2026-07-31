// Hits the ?debug=channels endpoint on prod to inspect Buffer.
import "@/lib/dev/load-env";

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET not set — check .env.local");
    process.exit(1);
  }
  const res = await fetch(
    "https://www.propertoasty.com/api/cron/social-agent?debug=channels",
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  console.log(`HTTP ${res.status}\n`);
  console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
