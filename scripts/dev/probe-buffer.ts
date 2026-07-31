import "@/lib/dev/load-env";
async function main() {
  const s = process.env.CRON_SECRET!;
  const r = await fetch(
    "https://www.propertoasty.com/api/cron/social-agent?debug=probe",
    { headers: { Authorization: `Bearer ${s}` } },
  );
  console.log(`HTTP ${r.status}\n`);
  console.log(JSON.stringify(await r.json(), null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
