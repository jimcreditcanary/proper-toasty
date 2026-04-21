import { z } from "zod";
import type { PlaceDetails, PlaceSuggestion } from "@/lib/schemas/places";

const PLACES_BASE = "https://places.googleapis.com/v1";

// Subset of the Places API (New) Autocomplete response we care about.
const AutocompleteRawSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            structuredFormat: z
              .object({
                mainText: z.object({ text: z.string() }),
                secondaryText: z.object({ text: z.string() }).optional(),
              })
              .optional(),
            text: z.object({ text: z.string() }),
          })
          .optional(),
      })
    )
    .optional(),
});

const DetailsRawSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
  addressComponents: z.array(
    z.object({
      longText: z.string(),
      shortText: z.string(),
      types: z.array(z.string()),
    })
  ),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
});

function requireKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_KEY not set");
  return key;
}

export async function autocompleteAddress(
  input: string,
  sessionToken: string
): Promise<PlaceSuggestion[]> {
  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["gb"],
      includedPrimaryTypes: ["street_address", "premise"],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Places Autocomplete failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = AutocompleteRawSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Places Autocomplete returned unexpected shape");

  return (parsed.data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      placeId: p.placeId,
      primaryText: p.structuredFormat?.mainText.text ?? p.text.text,
      secondaryText: p.structuredFormat?.secondaryText?.text,
      fullText: p.text.text,
    }));
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<PlaceDetails> {
  const url = new URL(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("sessionToken", sessionToken);

  const res = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": requireKey(),
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Place Details failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = DetailsRawSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Place Details returned unexpected shape");

  const d = parsed.data;
  const postcode =
    d.addressComponents.find((c) => c.types.includes("postal_code"))?.longText ?? null;
  const line1 =
    d.addressComponents.find((c) => c.types.includes("street_address"))?.longText ??
    d.formattedAddress.split(",")[0]?.trim() ??
    d.formattedAddress;

  return {
    placeId: d.id,
    formattedAddress: d.formattedAddress,
    line1,
    postcode,
    latitude: d.location.latitude,
    longitude: d.location.longitude,
  };
}
