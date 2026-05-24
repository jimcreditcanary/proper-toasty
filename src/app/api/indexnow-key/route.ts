// Serves the IndexNow key as plain text. Reached via a next.config
// rewrite from /<key>.txt (the location IndexNow expects), so engines
// can verify we own the key before accepting submissions.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.INDEX_NOW_KEY;
  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
