#!/usr/bin/env tsx
//
// One-shot diagnostic — runs ONE query against Claude with web_search
// and dumps the full content-block structure so we can see exactly
// where URLs / citations live in the response.
//
// Usage:
//   npx tsx scripts/ai-visibility/debug-shape.ts "Heat pump cost UK"

import "../../src/lib/dev/load-env";
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const query = process.argv[2] ?? "How much does a heat pump cost in the UK?";
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`Query: ${query}\n`);

  const resp = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [
      {
        type: "web_search_20260209" as never,
        name: "web_search",
        max_uses: 3,
      } as never,
    ],
    messages: [{ role: "user", content: query }],
  });

  console.log(`Stop reason: ${resp.stop_reason}`);
  console.log(`Content blocks: ${resp.content.length}`);
  console.log(`Input tokens:  ${resp.usage?.input_tokens}`);
  console.log(`Output tokens: ${resp.usage?.output_tokens}`);
  console.log("");

  resp.content.forEach((block, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = block as any;
    console.log(`── Block ${i} ── type=${b.type}`);
    if (b.type === "text") {
      console.log(`  text (first 200ch): ${(b.text ?? "").slice(0, 200)}`);
      if (b.citations) {
        console.log(`  citations: ${b.citations.length}`);
        b.citations.slice(0, 3).forEach((c: unknown, j: number) => {
          console.log(`    [${j}]: ${JSON.stringify(c).slice(0, 250)}`);
        });
      } else {
        console.log("  citations: (none)");
      }
    } else if (b.type === "server_tool_use" || b.type === "tool_use") {
      console.log(`  name: ${b.name}, input: ${JSON.stringify(b.input).slice(0, 200)}`);
    } else if (b.type === "web_search_tool_result") {
      console.log(`  tool_use_id: ${b.tool_use_id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = b.content as any;
      if (Array.isArray(content)) {
        console.log(`  results: ${content.length}`);
        content.slice(0, 3).forEach((r: unknown, j: number) => {
          console.log(`    [${j}]: ${JSON.stringify(r).slice(0, 250)}`);
        });
      } else {
        console.log(`  content: ${JSON.stringify(content).slice(0, 250)}`);
      }
    } else {
      console.log(`  raw: ${JSON.stringify(b).slice(0, 300)}`);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
