export const FLOORPLAN_SYSTEM = `You are a UK property surveyor's assistant analysing a residential floorplan to help a heat-pump and solar installer scope a pre-survey.

You are NOT producing an engineering design. You are extracting observable facts and laying out a simplified diagram. Be conservative — if something is unclear, say so rather than guessing.

You must:
1. Identify each ROOM in the floorplan and produce a simplified rectangular layout for it.
2. Estimate room dimensions in METRES. If the floorplan uses imperial units (ft/in), convert to metres before reporting.
3. Identify candidate locations for a 1m² air-source heat pump unit — outdoor preferred (side return, garden wall, garage), indoor utility-room as a fallback.
4. Identify candidate locations for a hot water cylinder — typical UK unvented cylinder is 0.6m × 0.6m footprint and 1.5–2m tall, sits indoors (airing cupboard, utility room, under-stairs cupboard, loft), needs to be near central heating pipework. The user wants to see at-scale whether it actually fits.
5. Note any radiators visible from the floorplan symbols, including which room they sit in.

Output STRICT JSON matching the provided schema. Do not include prose outside the JSON.`;

export interface FloorplanContext {
  epcFloorAreaM2: number | null;
  epcPropertyType: string | null;
  epcAgeBand: string | null;
}

export function floorplanUserPrompt(context: FloorplanContext): string {
  return `Context from the EPC register (may be missing or inaccurate — treat as a hint):
- Total floor area: ${context.epcFloorAreaM2 ?? "unknown"} m²
- Property type: ${context.epcPropertyType ?? "unknown"}
- Age band: ${context.epcAgeBand ?? "unknown"}

Analyse the attached floorplan image and return JSON with the following shape.

The DIAGRAM is laid out in a normalised 1000×1000 viewport. (0,0) is top-left,
x increases right, y increases down. Rooms are axis-aligned rectangles —
do not use polygons or rotated shapes. Try to keep rooms roughly proportional
to each other (a kitchen that's twice the size of a bathroom should look
twice the size in the diagram). Group rooms on the same floor; if there are
multiple floors, lay them out side-by-side or stacked with clear gaps.

For each room, also report its real width and height in METRES. If the
floorplan has dimension labels, use those. If it shows imperial units,
convert to metres (1 ft = 0.3048 m). If neither is available, fall back to
estimating from the EPC total area.

For HEAT PUMP LOCATIONS: a typical air-source unit needs ~1m × 1m of
ground space, ~30cm clearance from walls, and an outdoor environment
ideally facing away from neighbouring windows. Suggest 1–3 candidate spots
visible on the floorplan (sides of the property, garden boundaries, utility
room as indoor fallback). Each spot should be placed in the diagram
coordinate space.

For RADIATORS: only include ones visibly marked on the floorplan (rectangular
symbols against walls). Set "condition" to null — the user will rate them.

JSON shape:
{
  "rooms": [
    {
      "id": "r1",                    // any unique string
      "label": "Kitchen",
      "type": "kitchen",             // bedroom|bathroom|kitchen|living|dining|utility|hall|stairs|wc|other
      "floor": 0,                    // 0=ground, 1=first, etc.
      "x": 100, "y": 200,            // top-left in viewport units (0..1000)
      "vWidth": 250, "vHeight": 200, // size in viewport units
      "widthM": 4.2, "heightM": 3.4, // real dimensions in metres (null if unknown)
      "areaM2": 14.3,                // widthM × heightM (null if either unknown)
      "source": "claude_detected"
    }
  ],
  "radiators": [
    {
      "id": "rad1",
      "roomId": "r1",
      "ux": 0.5, "uy": 0.05,         // 0..1 inside the room (0,0 = top-left of room)
      "condition": null,
      "source": "claude_detected"
    }
  ],
  "heatPumpLocations": [
    {
      "id": "hp1",
      "label": "Side return (left)",
      "type": "outdoor",             // outdoor|indoor
      "x": 50, "y": 400,             // viewport coords
      "vWidth": 50, "vHeight": 50,   // ~1m² footprint at the diagram scale
      "roomId": null,                // or the room id if it's an indoor location
      "notes": "Likely sufficient clearance; check neighbour windows.",
      "source": "claude_detected"
    }
  ],
  "hotWaterCylinderCandidates": [
    {
      "id": "hwc1",
      "label": "Airing cupboard (off bedroom corridor)",
      "x": 600, "y": 320,            // viewport coords
      "vWidth": 30, "vHeight": 30,   // ~0.6m × 0.6m footprint at the diagram scale
                                     // (smaller than HP because the real footprint is smaller)
      "roomId": "r5",                // which room it sits inside
      "notes": "Adjacent to existing boiler — minimal pipe run.",
      "source": "claude_detected"
    }
  ],
  "viewport": { "width": 1000, "height": 1000 },
  "unitsDetected": "m",              // "m" | "ft" | "unknown"
  "scaleAnchor": "floorplan_labels", // "floorplan_labels" | "epc_total_area" | "estimate" | "unknown"
  "edited": false,

  "roomCount": 0,                    // = rooms.length, total across floors
  "roomsByType": {
    "bedrooms": 0, "bathrooms": 0, "livingRooms": 0,
    "kitchens": 0, "utility": 0, "other": 0
  },
  "estimatedTotalAreaM2": null,      // sum of room areas (null if any room area is null)
  "floorsVisible": 1,                // distinct floor indices in rooms[]
  "radiatorsVisible": null,          // = radiators.length, or null if you couldn't find any reliably
  "boilerLocation": null,            // free-text, e.g. "Kitchen wall" — null if not visible
  "hotWaterCylinderSpace": {
    "likelyPresent": false,
    "location": null,
    "notes": ""
  },
  "externalWallExposure": "unknown", // low|medium|high|unknown — heat-loss proxy
  "outdoorSpace": {
    "indicated": false,              // is outdoor space visible on the floorplan?
    "adjacentToLivingSpace": null,
    "notes": "",
    "satelliteVerdict": null,        // leave null — set by the satellite check
    "satelliteNotes": null,
    "userConfirmed": null
  },
  "heatPumpInstallationConcerns": [],
  "solarInstallationConcerns": [],
  "confidence": "medium",            // high|medium|low — how reliable is this analysis?
  "confidenceNotes": "",
  "recommendedInstallerQuestions": []
}`;
}
