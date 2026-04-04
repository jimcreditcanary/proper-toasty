import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSearchesTable, type AdminSearchRow } from "@/components/admin-searches-table";
import { Search, DollarSign, TrendingUp, Receipt } from "lucide-react";

export default async function AdminAllSearchesPage() {
  const supabase = createAdminClient();

  // Fetch all verifications with user email
  const { data: verifications } = await supabase
    .from("verifications")
    .select("id, created_at, user_id, flow_type, payee_name, company_name_input, extracted_company_name, marketplace_item_title, overall_risk, status")
    .order("created_at", { ascending: false });

  // Fetch all users for email lookup
  const { data: users } = await supabase
    .from("users")
    .select("id, email");

  // Fetch all payments to compute price_per_credit per user (most recent completed payment)
  const { data: payments } = await supabase
    .from("payments")
    .select("user_id, amount, credits_purchased, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  // Fetch admin settings for cop_cost_per_check
  const { data: adminSettings } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "cop_cost_per_check")
    .single();

  const copCostPerCheck = adminSettings?.value
    ? Number(adminSettings.value)
    : 0;

  // Build user email lookup
  const userEmailMap = new Map<string, string>();
  if (users) {
    for (const u of users) {
      userEmailMap.set(u.id, u.email);
    }
  }

  // Build price_per_credit lookup (most recent payment per user)
  const userPriceMap = new Map<string, number>();
  if (payments) {
    for (const p of payments) {
      // Only take the first (most recent) payment per user
      if (!userPriceMap.has(p.user_id) && p.credits_purchased > 0) {
        // amount is in pence, convert to pounds per credit
        userPriceMap.set(p.user_id, p.amount / 100 / p.credits_purchased);
      }
    }
  }

  // Build rows
  const rows: AdminSearchRow[] = [];
  if (verifications) {
    for (const v of verifications) {
      const userId = v.user_id ?? "";
      const accountName =
        v.extracted_company_name ||
        v.company_name_input ||
        v.payee_name ||
        v.marketplace_item_title ||
        null;

      const userType: "Lead" | "User" | "API" =
        v.user_id == null ? "Lead" : v.flow_type === "api" ? "API" : "User";

      rows.push({
        id: v.id,
        created_at: v.created_at,
        user_email: userEmailMap.get(userId) ?? "Unknown",
        flow_type: v.flow_type ?? null,
        user_type: userType,
        account_name: accountName,
        overall_risk: v.overall_risk,
        status: v.status,
        price_per_credit: userPriceMap.get(userId) ?? 0,
        cop_cost_per_check: copCostPerCheck,
      });
    }
  }

  // Compute stats
  const totalSearches = rows.length;
  const totalRevenue = rows.reduce((sum, r) => sum + r.price_per_credit, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.cop_cost_per_check, 0);
  const totalProfit = totalRevenue - totalCost;

  function formatCurrency(amount: number) {
    return `\u00A3${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">All Searches</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            All verifications across all users
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { icon: Search, label: "Total searches", value: totalSearches.toLocaleString() },
          { icon: DollarSign, label: "Total revenue", value: formatCurrency(totalRevenue) },
          { icon: Receipt, label: "Total cost", value: formatCurrency(totalCost) },
          { icon: TrendingUp, label: "Total profit", value: formatCurrency(totalProfit), color: totalProfit >= 0 ? "text-pass" : "text-fail" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-navy-card border border-white/[0.06] p-5">
            <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-2">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <div className={`text-2xl font-bold ${"color" in stat && stat.color ? stat.color : "text-white"}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 rounded-2xl bg-navy-card border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">Verification history</h2>
          <p className="text-sm text-brand-muted mt-0.5">All user verifications with revenue and cost breakdown</p>
        </div>
        {rows.length === 0 ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-3 size-10 text-brand-muted/50" />
              <p className="text-sm font-medium text-white">No verifications yet</p>
              <p className="mt-1 text-xs text-brand-muted">
                Verifications from all users will appear here.
              </p>
            </div>
          </div>
        ) : (
          <AdminSearchesTable rows={rows} />
        )}
      </div>
    </div>
  );
}
