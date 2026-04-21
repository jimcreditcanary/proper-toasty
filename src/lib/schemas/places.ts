import { z } from "zod";

export const PlacesAutocompleteRequestSchema = z.object({
  input: z.string().min(2).max(200),
  sessionToken: z.string().min(1).max(64),
});

export const PlaceSuggestionSchema = z.object({
  placeId: z.string(),
  primaryText: z.string(),
  secondaryText: z.string().optional(),
  fullText: z.string(),
});

export const PlacesAutocompleteResponseSchema = z.object({
  suggestions: z.array(PlaceSuggestionSchema),
});

export const PlaceDetailsRequestSchema = z.object({
  placeId: z.string().min(1),
  sessionToken: z.string().min(1).max(64),
});

export const PlaceDetailsResponseSchema = z.object({
  placeId: z.string(),
  formattedAddress: z.string(),
  line1: z.string(),
  postcode: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

export type PlaceSuggestion = z.infer<typeof PlaceSuggestionSchema>;
export type PlaceDetails = z.infer<typeof PlaceDetailsResponseSchema>;
