import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BuyCreditsDialog } from "@/components/buy-credits-dialog";
import { Coins, FileCheck, Clock, Upload } from "lucide-react";

const RISK_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  LOW: { label: "Low Risk", variant: "default" },
  MEDIUM: { label: "Medium Risk", variant: "secondary" },
  HIGH: { label: "High Risk", variant: "destructive" },
  UNKNOWN: { label: "Unknown", variant: "outline" },
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  processing: "secondary",
  pending: "outline",
  failed: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | null | undefined) {
  if (amount == null) return "\u2014";
  return `\u00A3${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

type HistoryRow = {
  id: string;
  created_at: string;
  source: "verification" | "scan";
  fileName: string | null;
  accountName: string | null;
  amount: number | null;
  risk: string | null;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  const { data: verifications } = await supabase
    .from("verifications")
    .select("id, created_at, status, payee_name, company_name_input, extracted_company_name, invoice_amount, extracted_invoice_amount, marketplace_listed_price, overall_risk, flow_type, invoice_file_path, marketplace_item_title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: scans } = await supabase
    .from("scans")
    .select("id, file_name, status, company_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const history: HistoryRow[] = [];

  if (verifications) {
    for (const v of verifications) {
      const name = v.extracted_company_name || v.company_name_input || v.payee_name || v.marketplace_item_title || null;
      const amount = v.extracted_invoice_amount ?? v.invoice_amount ?? v.marketplace_listed_price ?? null;
      const fileName = v.invoice_file_path
        ? v.invoice_file_path.split("/").pop() ?? null
        : v.flow_type === "marketplace"
          ? "Marketplace"
          : "Manual entry";
      history.push({
        id: v.id,
        created_at: v.created_at,
        source: "verification",
        fileName,
        accountName: name,
        amount: amount != null ? Number(amount) : null,
        risk: v.overall_risk,
        status: v.status ?? "pending",
      });
    }
  }

  if (scans) {
    for (const s of scans) {
      if (history.some((h) => h.id === s.id)) continue;
      history.push({
        id: s.id,
        created_at: s.created_at,
        source: "scan",
        fileName: s.file_name,
        accountName: s.company_name,
        amount: null,
        risk: null,
        status: s.status,
      });
    }
  }

  history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const credits = profile?.credits ?? 0;
  const totalCount = history.length;
  const completedCount = history.filter((h) => h.status === "completed").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">Dashboard</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Upload and verify invoices
          </p>
        </div>
        <div className="flex gap-2">
          <BuyCreditsDialog />
          <Button
            className="bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
            render={<Link href="/verify" />}
          >
            <Upload className="size-4 mr-1.5" />
            Make a check
          </Button>
        </div>
      </div>

      {/* Low credits alert */}
      {credits > 0 && credits < 5 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-warn/20 bg-warn/[0.08] p-4">
          <Coins className="size-5 text-warn shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warn">
              You have {credits} credit{credits === 1 ? "" : "s"} remaining
            </p>
            <p className="text-xs text-warn/70">
              Top up now so you&apos;re ready for your next check.
            </p>
          </div>
          <BuyCreditsDialog />
        </div>
      )}

      {/* No credits alert */}
      {credits === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-fail/20 bg-fail/[0.08] p-4">
          <Coins className="size-5 text-fail shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-fail">
              You have no credits
            </p>
            <p className="text-xs text-fail/70">
              Buy credits to start verifying invoices and payments.
            </p>
          </div>
          <BuyCreditsDialog />
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Coins, label: "Credits remaining", value: credits },
          { icon: FileCheck, label: "Verifications completed", value: completedCount },
          { icon: Clock, label: "Total checks", value: totalCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-navy-card border border-white/[0.06] p-5">
            <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-2">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* History table */}
      <div className="mt-6 rounded-2xl bg-navy-card border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">Verification history</h2>
          <p className="text-sm text-brand-muted mt-0.5">Your recent verification checks</p>
        </div>
        <div className="p-6">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="mb-3 size-10 text-brand-muted/50" />
              <p className="text-sm font-medium text-white">No verifications yet</p>
              {credits > 0 ? (
                <div className="mt-3">
                  <p className="text-xs text-brand-muted mb-3">
                    You have {credits} credit{credits === 1 ? "" : "s"} ready to use.
                  </p>
                  <Button
                    className="bg-coral hover:bg-coral-dark text-white font-bold rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
                    render={<Link href="/verify" />}
                  >
                    <Upload className="size-4 mr-1.5" />
                    Run your first check
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-xs text-brand-muted mb-3">
                    Buy credits to start verifying invoices and payments.
                  </p>
                  <BuyCreditsDialog />
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">File</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Account Name</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Amount</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const href = row.source === "verification"
                      ? `/dashboard/results/${row.id}`
                      : `/dashboard/scans/${row.id}`;
                    const riskInfo = row.risk ? RISK_BADGE[row.risk] ?? RISK_BADGE.UNKNOWN : null;
                    return (
                      <tr key={`${row.source}-${row.id}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-2 text-brand-muted-light whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="py-3 px-2">
                          <Link
                            href={href}
                            className="font-medium text-coral hover:text-coral-light underline underline-offset-4"
                          >
                            {row.fileName ?? "\u2014"}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-brand-muted-light">
                          {row.accountName ?? "\u2014"}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-brand-muted-light">
                          {formatAmount(row.amount)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {row.status === "completed" && riskInfo ? (
                            <Badge variant={riskInfo.variant}>{riskInfo.label}</Badge>
                          ) : row.status !== "completed" ? (
                            <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                              {row.status}
                            </Badge>
                          ) : (
                            <span className="text-brand-muted">\u2014</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
