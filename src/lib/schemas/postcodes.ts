import { z } from "zod";

export const PostcodeValidateRequestSchema = z.object({
  postcode: z.string().min(2).max(10),
});

export const PostcodeValidateResponseSchema = z.object({
  postcode: z.string(),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]),
  adminDistrict: z.string().nullable(),
  region: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export type PostcodeValidateResponse = z.infer<typeof PostcodeValidateResponseSchema>;
