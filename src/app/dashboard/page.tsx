import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BuyCreditsDialog } from "@/components/buy-credits-dialog";
import { VerificationHistoryTable } from "@/components/verification-history-table";
import { Coins, FileCheck, Clock, Upload } from "lucide-react";

type HistoryRow = {
  id: string;
  shortId: string;
  created_at: string;
  source: "verification" | "scan";
  flowType: string | null;
  fileName: string | null;
  accountName: string | null;
  amount: number | null;
  risk: string | null;
  status: string;
  paymentStatus: string | null;
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
    .select("id, short_id, created_at, status, payee_name, company_name_input, extracted_company_name, invoice_amount, extracted_invoice_amount, marketplace_listed_price, overall_risk, flow_type, invoice_file_path, marketplace_item_title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: obPayments } = await supabase
    .from("ob_payments")
    .select("verification_id, status")
    .eq("user_id", user.id);

  const paymentStatusMap: Record<string, string> = {};
  if (obPayments) {
    for (const op of obPayments) {
      if (op.verification_id) {
        paymentStatusMap[op.verification_id] = op.status;
      }
    }
  }

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
        : v.flow_type === "api"
          ? "API request"
          : v.flow_type === "marketplace"
            ? "Marketplace"
            : "Manual entry";
      history.push({
        id: v.id,
        shortId: v.short_id,
        created_at: v.created_at,
        source: "verification",
        flowType: v.flow_type ?? null,
        fileName,
        accountName: name,
        amount: amount != null ? Number(amount) : null,
        risk: v.overall_risk,
        status: v.status ?? "pending",
        paymentStatus: paymentStatusMap[v.id] ?? null,
      });
    }
  }

  if (scans) {
    for (const s of scans) {
      if (history.some((h) => h.id === s.id)) continue;
      history.push({
        id: s.id,
        shortId: "",
        created_at: s.created_at,
        source: "scan",
        flowType: null,
        fileName: s.file_name,
        accountName: s.company_name,
        amount: null,
        risk: null,
        status: s.status,
        paymentStatus: null,
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
          <h1 className="text-2xl text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and verify invoices
          </p>
        </div>
        <div className="flex gap-2">
          <BuyCreditsDialog />
          <Button
            className="h-12 px-6 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
            render={<Link href="/verify" />}
          >
            <Upload className="size-5 mr-2" />
            Make a check
          </Button>
        </div>
      </div>

      {/* Low credits alert */}
      {credits > 0 && credits < 5 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Coins className="size-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600">
              You have {credits} credit{credits === 1 ? "" : "s"} remaining
            </p>
            <p className="text-xs text-amber-600/70">
              Top up now so you&apos;re ready for your next check.
            </p>
          </div>
          <BuyCreditsDialog />
        </div>
      )}

      {/* No credits alert */}
      {credits === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <Coins className="size-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-600">
              You have no credits
            </p>
            <p className="text-xs text-red-600/70">
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
          <div key={stat.label} className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* History table */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Verification history</h2>
          <p className="text-sm text-slate-400 mt-0.5">Your recent verification checks</p>
        </div>
        {history.length === 0 ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="mb-3 size-10 text-slate-400/50" />
              <p className="text-sm font-medium text-slate-900">No verifications yet</p>
              {credits > 0 ? (
                <div className="mt-3">
                  <p className="text-xs text-slate-400 mb-3">
                    You have {credits} credit{credits === 1 ? "" : "s"} ready to use.
                  </p>
                  <Button
                    className="h-12 px-6 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
                    render={<Link href="/verify" />}
                  >
                    <Upload className="size-5 mr-2" />
                    Run your first check
                  </Button>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-xs text-slate-400 mb-3">
                    Buy credits to start verifying invoices and payments.
                  </p>
                  <BuyCreditsDialog />
                </div>
              )}
            </div>
          </div>
        ) : (
          <VerificationHistoryTable history={history} />
        )}
      </div>
    </div>
  );
}
