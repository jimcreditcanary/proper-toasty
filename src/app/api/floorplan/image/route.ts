import { NextResponse } from "next/server";
import { signedReadUrl } from "@/lib/services/floorplan";

// GET /api/floorplan/image?key=<objectKey>
//
// Proxies the Supabase signed URL so the client can render the private-
// bucket image inside an <img> tag without handling signed URL expiry.
// The private bucket + 90-day retention policy lives unchanged behind
// this; this endpoint is just a short-lived re-signer.

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const objectKey = url.searchParams.get("key");
  if (!objectKey) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  // Keep the path contained — key should look like anon-uploads/<id>/...
  // Refuse traversal attempts.
  if (objectKey.includes("..") || objectKey.startsWith("/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  let signed: string;
  try {
    signed = await signedReadUrl(objectKey, 300);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not sign URL",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 404 },
    );
  }

  // Stream the image through — keeps the signed URL server-side.
  try {
    const upstream = await fetch(signed);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error", status: upstream.status },
        { status: 502 },
      );
    }
    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Images are effectively immutable (object key = storage path).
        // 5 min cache is plenty for the editor session.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Fetch failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
