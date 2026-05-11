// Installer landing metrics — the "pulse / beating heart of deal flow"
// numbers that lead the redesigned /installer page.
//
// Six headline tiles, all parallelised. Everything is bounded to the
// installer's own rows (installer_id filter) so the queries stay cheap
// even with no DB-side aggregation indexes.
//
//   - Upcoming meetings    — pending or booked, scheduled in the future
//   - Booked this month    — installer_meetings.created_at this month
//   - Quotes sent this mth — installer_proposals.sent_at this month
//   - Quotes outstanding £ — installer revenue ex-VAT on sent-but-not
//                            -accepted (gross of BUS grant — the grant
//                            is a pass-through reimbursed by Ofgem so
//                            it's not a deduction from the installer's
//                            books).
//   - Quotes won this mth  — installer_proposals.accepted_at this month
//   - Won value this mth   — installer revenue ex-VAT on accepted
//
// "This month" = first day of current calendar month, UK clock.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  installerRevenueExVatPence,
  lineItemSchema,
  type LineItem,
} from "@/lib/proposals/schema";
import { z } from "zod";

// Defensive parse of the JSONB line_items column. proposals are
// written through computeTotals so the shape is sound, but a row
// from before the schema bump or a manual db tweak shouldn't crash
// the dashboard.
const LineItemsArraySchema = z.array(lineItemSchema);
function parseLineItems(raw: unknown): LineItem[] {
  const parsed = LineItemsArraySchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export interface InstallerDashboardMetrics {
  upcomingMeetings: number;
  /** ISO datetime of the next upcoming meeting, or null. */
  nextMeetingAt: string | null;
  meetingsThisMonth: number;
  quotesSentThisMonth: number;
  /** Sum of total_pence on quotes that are sent but not yet accepted/declined. */
  quotesOutstandingPence: number;
  quotesWonThisMonth: number;
  quotesWonValuePence: number;
}

function startOfThisMonthIso(): string {
  // Use local time of the server (UK in production) for the boundary.
  // Fine-grained timezone handling matters less than month-boundary
  // consistency with what the installer sees on the calendar.
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function loadInstallerDashboardMetrics(
  admin: SupabaseClient<Database>,
  installerId: number,
): Promise<InstallerDashboardMetrics> {
  const monthStart = startOfThisMonthIso();
  const nowIso = new Date().toISOString();

  const [
    upcomingRes,
    nextMeetingRes,
    monthMeetingsRes,
    sentRes,
    outstandingRes,
    wonRes,
  ] = await Promise.all([
    // Future-scheduled meetings that are still alive (pending or booked).
    admin
      .from("installer_meetings")
      .select("id", { count: "exact", head: true })
      .eq("installer_id", installerId)
      .gt("scheduled_at", nowIso)
      .in("status", ["pending", "booked"]),
    // Surface the next one's time so the tile can show "next: Wed 3pm".
    admin
      .from("installer_meetings")
      .select("scheduled_at")
      .eq("installer_id", installerId)
      .gt("scheduled_at", nowIso)
      .in("status", ["pending", "booked"])
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ scheduled_at: string }>(),
    // Meetings created this month (regardless of status — captures
    // booked, cancelled, completed all together for "this month".)
    admin
      .from("installer_meetings")
      .select("id", { count: "exact", head: true })
      .eq("installer_id", installerId)
      .gte("created_at", monthStart),
    // Quotes sent this month — counted by sent_at regardless of
    // current status, so a quote sent then accepted/declined still
    // shows up. The previous .eq("status", "sent") filter caused the
    // dashboard tile to drift out of sync with the Performance page,
    // which uses the same definition (sent_at within window). The
    // pipeline-value tile below is the right place to reflect
    // "currently outstanding" — this tile is "activity this month".
    admin
      .from("installer_proposals")
      .select("id", { count: "exact", head: true })
      .eq("installer_id", installerId)
      .gte("sent_at", monthStart)
      .not("sent_at", "is", null),
    // Outstanding pipeline £ — every quote currently in 'sent' status.
    // Pull line_items so we can compute installer revenue ex-VAT
    // (gross of the BUS grant — the grant is a pass-through). Using
    // total_pence would understate the figure because it's the
    // homeowner-pays bill after the grant deduction.
    admin
      .from("installer_proposals")
      .select("line_items")
      .eq("installer_id", installerId)
      .eq("status", "sent"),
    // Won this month — accepted quotes with the timestamp in this
    // month. Same logic as the pipeline tile: installer revenue
    // ex-VAT, treating BUS grant as a pass-through (Ofgem
    // reimburses the deduction so the grant is net-zero on the
    // installer's books). total_pence still drives the homeowner-
    // facing quote preview + invoices.
    admin
      .from("installer_proposals")
      .select("line_items")
      .eq("installer_id", installerId)
      .eq("status", "accepted")
      .gte("accepted_at", monthStart),
  ]);

  const quotesOutstandingPence = (outstandingRes.data ?? []).reduce(
    (acc, r) => acc + installerRevenueExVatPence(parseLineItems(r.line_items)),
    0,
  );
  const wonRows = wonRes.data ?? [];
  const quotesWonValuePence = wonRows.reduce(
    (acc, r) => acc + installerRevenueExVatPence(parseLineItems(r.line_items)),
    0,
  );

  return {
    upcomingMeetings: upcomingRes.count ?? 0,
    nextMeetingAt: nextMeetingRes.data?.scheduled_at ?? null,
    meetingsThisMonth: monthMeetingsRes.count ?? 0,
    quotesSentThisMonth: sentRes.count ?? 0,
    quotesOutstandingPence,
    quotesWonThisMonth: wonRows.length,
    quotesWonValuePence,
  };
}
