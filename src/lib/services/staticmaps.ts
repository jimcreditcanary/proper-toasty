/**
 * Google Static Maps — builds the URL. Fetching + streaming is done by the
 * /api/imagery/satellite route handler so the API key never reaches the client.
 */

interface StaticMapParams {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  scale?: 1 | 2;
}

export function buildStaticMapUrl({
  lat,
  lng,
  zoom = 20,
  width = 640,
  height = 400,
  scale = 2,
}: StaticMapParams): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_KEY not set");

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: String(scale),
    maptype: "satellite",
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
