import { z } from "zod";

// Schemas for the F3 "I can't find my company" path.
//
// Two endpoints feed the request form:
//   - POST /api/installer-signup/companies-house  — prefill from CH number
//   - POST /api/installer-signup/request          — submit the request

// ─── Companies House prefill ──────────────────────────────────────────

export const ChLookupRequestSchema = z.object({
  number: z
    .string()
    .trim()
    .min(6, "Companies House numbers are 6-8 characters")
    .max(10, "Companies House numbers are 6-8 characters")
    .regex(/^[A-Z]{0,2}\d{6,8}$/i, "Letters and digits only (e.g. 12345678 or SC123456)"),
});

export const ChLookupResponseSchema = z.object({
  ok: z.boolean(),
  prefill: z
    .object({
      companyNumber: z.string(),
      companyName: z.string(),
      address: z.string().nullable(),
      incorporationDate: z.string().nullable(),
      companyStatus: z.string().nullable(),
    })
    .optional(),
  error: z.string().optional(),
  reason: z
    .enum(["not_found", "rate_limited", "no_api_key", "error"])
    .optional(),
});
export type ChLookupResponse = z.infer<typeof ChLookupResponseSchema>;

// ─── Request submission ───────────────────────────────────────────────

// What the form sends. CH-prefilled fields come back through this
// payload (we don't trust client to NOT mutate them — we re-fetch on
// admin approval if needed, but the request row stores whatever was
// submitted).
//
// Capabilities: at least one must be true. Validation enforced both
// here (zod) and at the route handler level for safety.
export const InstallerSignupRequestSchema = z
  .object({
    // Optional — sole traders may have no CH number.
    companyNumber: z
      .string()
      .trim()
      .max(10)
      .optional()
      .nullable(),
    companyName: z
      .string()
      .trim()
      .min(2, "Company name is required")
      .max(200),
    chAddress: z.string().trim().max(500).optional().nullable(),
    chIncorporationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
      .optional()
      .nullable(),

    // Required contact fields.
    contactName: z
      .string()
      .trim()
      .min(2, "Your name is required")
      .max(120),
    contactEmail: z.string().trim().email("Enter a valid email").max(200),
    contactPhone: z
      .string()
      .trim()
      .min(7, "Phone number is required")
      .max(40),

    // BUS + capabilities
    busRegistered: z.boolean().default(false),
    capHeatPump: z.boolean().default(false),
    capSolarPv: z.boolean().default(false),
    capBatteryStorage: z.boolean().default(false),

    // MCS
    certificationBody: z
      .enum([
        "MCS",
        "NAPIT",
        "NICEIC",
        "ECA",
        "BSI",
        "RECC",
        "HIES",
        "Other",
      ])
      .nullable()
      .optional(),
    certificationNumber: z.string().trim().max(60).optional().nullable(),
    certificationPending: z.boolean().default(false),

    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    // At least one capability must be ticked.
    if (!val.capHeatPump && !val.capSolarPv && !val.capBatteryStorage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capHeatPump"],
        message: "Pick at least one speciality (heat pump, solar PV, or battery)",
      });
    }
    // Either a cert number OR the pending flag — not both empty.
    if (
      !val.certificationPending &&
      (!val.certificationNumber || val.certificationNumber.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["certificationNumber"],
        message:
          "Enter your MCS certification number, or tick \"pending certification\".",
      });
    }
  });

export type InstallerSignupRequest = z.infer<typeof InstallerSignupRequestSchema>;

export const InstallerSignupRequestResponseSchema = z.object({
  ok: z.boolean(),
  requestId: z.string().uuid().optional(),
  error: z.string().optional(),
});
export type InstallerSignupRequestResponse = z.infer<
  typeof InstallerSignupRequestResponseSchema
>;

// Admin-side action — approve or reject a pending request.
export const AdminRequestActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().trim().max(2000).optional().nullable(),
  // When approving, admin can override fields before insert (e.g. fix
  // a typo'd email). Defaults to the request payload when omitted.
  override: z
    .object({
      companyName: z.string().trim().min(2).max(200).optional(),
      contactEmail: z.string().email().optional(),
      certificationBody: z.string().trim().max(60).optional().nullable(),
      certificationNumber: z.string().trim().max(60).optional().nullable(),
      capHeatPump: z.boolean().optional(),
      capSolarPv: z.boolean().optional(),
      capBatteryStorage: z.boolean().optional(),
      busRegistered: z.boolean().optional(),
    })
    .optional(),
});
export type AdminRequestAction = z.infer<typeof AdminRequestActionSchema>;

export const AdminRequestActionResponseSchema = z.object({
  ok: z.boolean(),
  installerId: z.number().int().positive().optional(),
  error: z.string().optional(),
});
export type AdminRequestActionResponse = z.infer<
  typeof AdminRequestActionResponseSchema
>;

// Certification body options surface in the request form dropdown +
// the admin review override dropdown.
export const CERTIFICATION_BODIES = [
  "MCS",
  "NAPIT",
  "NICEIC",
  "ECA",
  "BSI",
  "RECC",
  "HIES",
  "Other",
] as const;
export type CertificationBody = (typeof CERTIFICATION_BODIES)[number];
