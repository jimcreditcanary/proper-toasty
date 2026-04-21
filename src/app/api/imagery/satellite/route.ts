import { NextResponse } from "next/server";
import { buildStaticMapUrl } from "@/lib/services/staticmaps";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const zoom = Number(url.searchParams.get("zoom") ?? "20");
  const width = Number(url.searchParams.get("w") ?? "640");
  const height = Number(url.searchParams.get("h") ?? "400");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
  }
  if (!Number.isFinite(zoom) || zoom < 1 || zoom > 21) {
    return NextResponse.json({ error: "Invalid zoom" }, { status: 400 });
  }
  if (!Number.isFinite(width) || width < 100 || width > 1280) {
    return NextResponse.json({ error: "Invalid width" }, { status: 400 });
  }
  if (!Number.isFinite(height) || height < 100 || height > 1280) {
    return NextResponse.json({ error: "Invalid height" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      buildStaticMapUrl({ lat, lng, zoom, width, height, scale: 2 })
    );
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "Static maps upstream error", status: upstream.status, body: text.slice(0, 200) },
        { status: 502 }
      );
    }
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=2592000, s-maxage=2592000, immutable",
      },
    });
  } catch (err) {
    console.error("satellite imagery error", err);
    return NextResponse.json({ error: "Imagery failed" }, { status: 502 });
  }
}
