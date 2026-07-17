// Postcodes.io outcode → centroid lookup.
//
// Postcode-district aggregate rows in epc_area_aggregates commonly
// lack lat/lng, which cascades into blank InstallerListSection
// renders (short-circuits on !lat || !lng) and 404 responses from
// the /heat-pump-installers/[area] + /solar-panel-installers/[area]
// routes (resolveArea returns null when lat/lng is missing).
//
// Postcodes.io's outcodes endpoint gives us a stable centroid per
// outward code (DN22, B64, AL7 …). We call it via the Next fetch
// cache with a 30-day TTL — outcode centroids are essentially
// static, so one hit per outcode per 30 days is plenty.
//
// Returns null on any failure so the caller can degrade gracefully
// (page still renders, minus whatever depended on the centroid).

import "server-only";

export async function fetchOutcodeCentroid(
  outcode: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://api.postcodes.io/outcodes/${encodeURIComponent(outcode.toUpperCase())}`,
      { next: { revalidate: 60 * 60 * 24 * 30 } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      result?: { latitude?: number; longitude?: number } | null;
    };
    const lat = j.result?.latitude;
    const lng = j.result?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}
