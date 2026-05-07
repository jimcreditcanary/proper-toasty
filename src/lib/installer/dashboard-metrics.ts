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
//   - Quotes outstanding £ — sum of total_pence on sent-but-not-accepted
//   - Quotes won this mth  — installer_proposals.accepted_at this month
//   - Won value this mth   — sum of total_pence on those accepted
//
// "This month" = first day of current calendar month, UK clock.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
    // Quotes sent this month.
    admin
      .from("installer_proposals")
      .select("id", { count: "exact", head: true })
      .eq("installer_id", installerId)
      .eq("status", "sent")
      .gte("sent_at", monthStart),
    // Outstanding pipeline £ — every quote currently in 'sent' status.
    // Pull rows so we can sum total_pence; PostgREST doesn't expose a
    // SUM aggregator without a view.
    admin
      .from("installer_proposals")
      .select("total_pence")
      .eq("installer_id", installerId)
      .eq("status", "sent"),
    // Won this month — accepted quotes with the timestamp in this month.
    // Pull subtotal (ex-VAT) for the dashboard tile because installers
    // think of "won" in terms of revenue they retain, not the gross
    // figure including VAT pass-through. total_pence still drives the
    // detailed proposal view + invoices.
    admin
      .from("installer_proposals")
      .select("subtotal_pence, total_pence")
      .eq("installer_id", installerId)
      .eq("status", "accepted")
      .gte("accepted_at", monthStart),
  ]);

  const quotesOutstandingPence = (outstandingRes.data ?? []).reduce(
    (acc, r) => acc + (r.total_pence ?? 0),
    0,
  );
  const wonRows = wonRes.data ?? [];
  const quotesWonValuePence = wonRows.reduce(
    (acc, r) => acc + (r.subtotal_pence ?? r.total_pence ?? 0),
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
