// Diagnostic: list every Buffer channel connected to the account,
// with the exact service string Buffer uses. Lets us align
// PLATFORM_TO_SERVICE in the cron route against reality.

import "@/lib/dev/load-env";
import { listChannels } from "@/lib/services/buffer";

async function main() {
  const channels = await listChannels(true);
  console.log(`Connected channels: ${channels.length}\n`);
  for (const c of channels) {
    console.log(`  service=${c.service.padEnd(12)} name=${c.name}  (id=${c.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
