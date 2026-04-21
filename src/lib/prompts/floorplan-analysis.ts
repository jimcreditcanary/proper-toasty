export const FLOORPLAN_SYSTEM = `You are a UK property surveyor's assistant analysing a residential floorplan to help a heat-pump and solar installer scope a pre-survey.

You are NOT producing an engineering design. You are extracting observable facts and flagging concerns. Be conservative — if something is unclear, say so rather than guessing.

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

Analyse the attached floorplan image and return JSON with:
{
  "roomCount": number,
  "roomsByType": {
    "bedrooms": number,
    "bathrooms": number,
    "livingRooms": number,
    "kitchens": number,
    "utility": number,
    "other": number
  },
  "estimatedTotalAreaM2": number | null,
  "floorsVisible": number,
  "radiatorsVisible": number | null,
  "boilerLocation": string | null,
  "hotWaterCylinderSpace": {
    "likelyPresent": boolean,
    "location": string | null,
    "notes": string
  },
  "externalWallExposure": "low" | "medium" | "high" | "unknown",
  "outdoorSpace": {
    "indicated": boolean,
    "adjacentToLivingSpace": boolean | null,
    "notes": string
  },
  "heatPumpInstallationConcerns": string[],
  "solarInstallationConcerns": string[],
  "confidence": "high" | "medium" | "low",
  "confidenceNotes": string,
  "recommendedInstallerQuestions": string[]
}`;
}
