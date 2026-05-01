// Shared helper for issuing a one-time report-share token, used by
// both the acknowledge route (when an installer declines) and the
// C4 auto-release cron. Mirrors the pattern in
// /api/reports/share — generate a UUID, sign it into a token,
// persist the row, return the public URL.
//
// 30-day expiry — long enough that the homeowner can come back to
// pick another installer at their leisure.

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildReportToken } from "@/lib/email/tokens";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;
type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];

const TOKEN_TTL_DAYS = 30;

interface IssueArgs {
  admin: AdminClient;
  lead: Pick<
    LeadRow,
    | "homeowner_lead_id"
    | "contact_email"
    | "analysis_snapshot"
    | "property_address"
    | "property_postcode"
    | "property_latitude"
    | "property_longitude"
  >;
  appBaseUrl: string;
}

export async function issueReportUrl(args: IssueArgs): Promise<string> {
  const { admin, lead, appBaseUrl } = args;
  const reportId = randomUUID();
  const token = buildReportToken(reportId);
  const expires = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error } = await admin.from("report_tokens").insert({
    id: reportId,
    token,
    kind: "self",
    homeowner_lead_id: lead.homeowner_lead_id ?? null,
    recipient_email: lead.contact_email,
    analysis_snapshot: (lead.analysis_snapshot ?? {}) as never,
    property_address: lead.property_address,
    property_postcode: lead.property_postcode,
    property_latitude: lead.property_latitude,
    property_longitude: lead.property_longitude,
    expires_at: expires,
  });
  if (error) {
    throw new Error(`report token insert failed: ${error.message}`);
  }
  return `${appBaseUrl.replace(/\/+$/, "")}/r/${token}`;
}
