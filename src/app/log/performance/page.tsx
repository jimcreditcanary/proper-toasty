import { createAdminClient } from "@/lib/supabase/admin";
import { AdminPerformance } from "@/components/admin-performance";

export type PaymentRow = {
  created_at: string;
  amount_total: number;
  credits_purchased: number;
  user_id: string;
};

export type VerificationRow = {
  created_at: string;
  user_id: string | null;
  anthropic_tokens_used: number | null;
  cop_result: string | null;
};

export type UserRow = {
  id: string;
  credits: number;
  email: string;
};

export type LeadRow = {
  email: string;
  created_at: string;
};

export type AdminSettings = {
  cop_cost_per_check: number;
  monthly_hosting_cost: number;
  anthropic_cost_per_1k_tokens: number;
};

export default async function LogPerformancePage() {
  const admin = createAdminClient();

  // Fetch all data in parallel
  const [paymentsRes, verificationsRes, usersRes, leadsRes, settingsRes] =
    await Promise.all([
      admin
        .from("payments")
        .select("created_at, amount, credits_purchased, user_id")
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
      admin
        .from("verifications")
        .select("created_at, user_id, anthropic_tokens_used, cop_result")
        .order("created_at", { ascending: false }),
      admin.from("users").select("id, credits, email"),
      admin.from("leads").select("email, created_at"),
      admin.from("admin_settings").select("key, value"),
    ]);

  // Map payments to expected shape (DB column is "amount", we expose as "amount_total")
  const payments: PaymentRow[] = (paymentsRes.data ?? []).map((p) => {
    const raw = p as Record<string, unknown>;
    return {
      created_at: raw.created_at as string,
      amount_total: (raw.amount as number) ?? 0,
      credits_purchased: (raw.credits_purchased as number) ?? 0,
      user_id: raw.user_id as string,
    };
  });

  const verifications: VerificationRow[] = (verificationsRes.data ?? []).map(
    (v) => {
      const raw = v as Record<string, unknown>;
      return {
        created_at: raw.created_at as string,
        user_id: (raw.user_id as string) ?? null,
        anthropic_tokens_used: (raw.anthropic_tokens_used as number) ?? null,
        cop_result: (raw.cop_result as string) ?? null,
      };
    }
  );

  const users: UserRow[] = (usersRes.data ?? []).map((u) => {
    const raw = u as Record<string, unknown>;
    return {
      id: raw.id as string,
      credits: (raw.credits as number) ?? 0,
      email: raw.email as string,
    };
  });

  const leads: LeadRow[] = (leadsRes.data ?? []).map((l) => {
    const raw = l as Record<string, unknown>;
    return {
      email: raw.email as string,
      created_at: raw.created_at as string,
    };
  });

  // Build settings object
  const settingsMap: Record<string, number> = {};
  for (const row of settingsRes.data ?? []) {
    const raw = row as Record<string, unknown>;
    settingsMap[raw.key as string] = Number(raw.value);
  }

  const settings: AdminSettings = {
    cop_cost_per_check: settingsMap.cop_cost_per_check ?? 0.15,
    monthly_hosting_cost: settingsMap.monthly_hosting_cost ?? 0,
    anthropic_cost_per_1k_tokens: settingsMap.anthropic_cost_per_1k_tokens ?? 0.003,
  };

  // Build userPriceMap: user_id -> price_per_credit (amount / credits_purchased)
  const userTotals: Record<string, { totalAmount: number; totalCredits: number }> = {};
  for (const p of payments) {
    if (!userTotals[p.user_id]) {
      userTotals[p.user_id] = { totalAmount: 0, totalCredits: 0 };
    }
    userTotals[p.user_id].totalAmount += p.amount_total;
    userTotals[p.user_id].totalCredits += p.credits_purchased;
  }

  const userPriceMap: Record<string, number> = {};
  for (const [userId, totals] of Object.entries(userTotals)) {
    userPriceMap[userId] =
      totals.totalCredits > 0
        ? totals.totalAmount / 100 / totals.totalCredits
        : 0;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">Performance</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Revenue, costs, and conversion metrics
          </p>
        </div>
      </div>

      <div className="mt-6">
        <AdminPerformance
          payments={payments}
          verifications={verifications}
          users={users}
          leads={leads}
          settings={settings}
          userPriceMap={userPriceMap}
        />
      </div>
    </div>
  );
}
