import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromTable(admin: ReturnType<typeof createAdminClient>, table: string) {
  return (admin as any).from(table);
}
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  FileText,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Coins,
  CalendarDays,
} from "lucide-react";

type SubscriptionRow = {
  id: string;
  plan_type: string;
  monthly_credits: number;
  price_per_credit: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  stripe_invoice_id: string | null;
  amount: number;
  credits: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active" || status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-3" />
        {status === "active" ? "Active" : "Paid"}
      </span>
    );
  }
  if (status === "past_due") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <AlertCircle className="size-3" />
        Past due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      <XCircle className="size-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();

  const [subsRes, invoicesRes, profileRes] = await Promise.all([
    fromTable(admin, "enterprise_subscriptions")
      .select(
        "id, plan_type, monthly_credits, price_per_credit, status, current_period_start, current_period_end, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    fromTable(admin, "enterprise_invoices")
      .select(
        "id, stripe_invoice_id, amount, credits, status, period_start, period_end, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    fromTable(admin, "users").select("credits, enterprise").eq("id", user.id).single(),
  ]);

  const subscriptions: SubscriptionRow[] = (subsRes.data ?? []).map((s: unknown) => {
    const raw = s as Record<string, unknown>;
    return {
      id: raw.id as string,
      plan_type: raw.plan_type as string,
      monthly_credits: raw.monthly_credits as number,
      price_per_credit: Number(raw.price_per_credit),
      status: raw.status as string,
      current_period_start: (raw.current_period_start as string) ?? null,
      current_period_end: (raw.current_period_end as string) ?? null,
      created_at: raw.created_at as string,
    };
  });

  const invoices: InvoiceRow[] = (invoicesRes.data ?? []).map((i: unknown) => {
    const raw = i as Record<string, unknown>;
    return {
      id: raw.id as string,
      stripe_invoice_id: (raw.stripe_invoice_id as string) ?? null,
      amount: raw.amount as number,
      credits: raw.credits as number,
      status: raw.status as string,
      period_start: (raw.period_start as string) ?? null,
      period_end: (raw.period_end as string) ?? null,
      created_at: raw.created_at as string,
    };
  });

  const credits = (profileRes.data as unknown as Record<string, unknown>)?.credits as number ?? 0;
  const activeSub = subscriptions.find((s) => s.status === "active");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-slate-900">Billing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your subscription and view invoices
          </p>
        </div>
        {!activeSub && (
          <Button
            className="h-10 px-5 bg-coral hover:bg-coral-dark text-white font-semibold text-sm rounded-lg"
            render={<Link href="/enterprise" />}
          >
            View enterprise plans
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Credit balance */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <Coins className="size-5 text-coral" />
          <h2 className="font-semibold text-slate-900">Credit balance</h2>
        </div>
        <div className="text-3xl font-bold text-slate-900 mt-2">
          {credits} credit{credits !== 1 ? "s" : ""}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Enhanced verification checks available
        </p>
      </div>

      {/* Active subscription */}
      {activeSub && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="size-5 text-coral" />
            <h2 className="font-semibold text-slate-900">
              Active subscription
            </h2>
            <StatusBadge status={activeSub.status} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Plan
              </p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {activeSub.monthly_credits} checks/month
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Rate
              </p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                £{activeSub.price_per_credit.toFixed(2)}/check
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                Next renewal
              </p>
              <p className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                <CalendarDays className="size-4 text-slate-400" />
                {formatDate(activeSub.current_period_end)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No subscription */}
      {!activeSub && (
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-8 text-center">
          <CreditCard className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900">No active subscription</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Get volume pricing and monthly credits with an enterprise
            subscription. Plans start at £45/month.
          </p>
          <Button
            className="mt-4 h-11 px-6 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
            render={<Link href="/enterprise" />}
          >
            View enterprise plans
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Invoices */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-coral" />
            <h2 className="font-semibold text-slate-900">Invoices</h2>
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="size-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No invoices yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Credits</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 text-slate-700">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {formatDate(inv.period_start)} –{" "}
                      {formatDate(inv.period_end)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {inv.credits}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {formatAmount(inv.amount)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {inv.stripe_invoice_id && (
                        <button
                          className="inline-flex items-center gap-1 text-coral hover:text-coral-dark text-xs font-medium"
                        >
                          <Download className="size-3" />
                          PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past subscriptions */}
      {subscriptions.filter((s) => s.status !== "active").length > 0 && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">
              Past subscriptions
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {subscriptions
              .filter((s) => s.status !== "active")
              .map((sub) => (
                <div key={sub.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {sub.monthly_credits} checks/month @ £
                      {sub.price_per_credit.toFixed(2)}/check
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Started {formatDate(sub.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
