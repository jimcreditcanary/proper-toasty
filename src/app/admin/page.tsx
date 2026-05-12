import { PortalShell } from "@/components/portal-shell";
import {
  BarChart3,
  Building2,
  Eye,
  FileText,
  Newspaper,
  PoundSterling,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin portal landing.
//
// Each card is a placeholder for a feature being shipped in subsequent
// PRs. Once a feature lands, its card flips to a real link.

interface FeatureCard {
  title: string;
  body: string;
  icon: LucideIcon;
  status: "live" | "coming-soon";
  href?: string;
  badge?: number;
}

async function loadPendingRequestCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("installer_signup_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const pendingRequests = await loadPendingRequestCount();

  const features: FeatureCard[] = [
    {
      title: "Installer requests",
      body: "Review installers asking to be added to the directory. Approve, reject, or request more info.",
      icon: Building2,
      status: "live",
      href: "/admin/installer-requests",
      badge: pendingRequests,
    },
    {
      title: "User management",
      body: "Edit roles, block accounts, adjust credits — every action audited.",
      icon: Users,
      status: "live",
      href: "/admin/users",
    },
    {
      title: "Performance dashboard",
      body: "Volume, conversion funnel, and MCS approval health — filterable by range.",
      icon: BarChart3,
      status: "live",
      href: "/admin/performance",
    },
    {
      title: "Blog manager",
      body: "Create, edit and delete Journal posts.",
      icon: Newspaper,
      status: "live",
      href: "/dashboard/admin/blog",
    },
    {
      title: "Report history",
      body: "Search every report by short ID, address, postcode, UPRN or user email.",
      icon: FileText,
      status: "live",
      href: "/admin/reports",
    },
    {
      // Edits the per-unit cost rates that feed the P&L dashboard
      // (Claude / Solar / Postcoder / emails / Stripe / Vercel /
      // Supabase). Each rate persists in admin_settings under
      // `cost_rate.<field>` and falls back to DEFAULT_COST_RATES
      // when no row exists. Keep in sync with supplier invoices
      // — drift on Anthropic + Google is real.
      title: "Cost rates",
      body: "Edit per-unit cost rates (Claude, Solar, Postcoder, emails, Stripe, hosting) that drive the P&L. Update when supplier pricing changes.",
      icon: PoundSterling,
      status: "live",
      href: "/admin/settings/cost-rates",
    },
    {
      // Whether ChatGPT / Claude / Perplexity et al cite us when
      // UK homeowners ask common heat-pump + solar questions.
      // Populated by scripts/ai-visibility/run-check.ts (manual /
      // weekly cron). Watch this number trend up.
      title: "AI search visibility",
      body: "Track whether AI assistants cite Propertoasty on the top 50 UK heat-pump + solar queries. Run weekly.",
      icon: Eye,
      status: "live",
      href: "/admin/ai-visibility",
    },
  ];

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Welcome back"
      pageSubtitle="Manage users, watch performance, and keep the directory honest."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <FeatureTile key={f.title} feature={f} />
        ))}
      </div>
    </PortalShell>
  );
}

function FeatureTile({ feature }: { feature: FeatureCard }) {
  const Icon = feature.icon;
  const card = (
    <div
      className={`rounded-xl border p-5 transition-all h-full flex flex-col ${
        feature.status === "live"
          ? "border-slate-200 bg-white hover:border-coral/30 hover:shadow-sm cursor-pointer"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${
            feature.status === "live"
              ? "bg-coral-pale text-coral-dark"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="text-base font-semibold text-navy">{feature.title}</h3>
        {feature.status === "coming-soon" && (
          <span className="ml-auto inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
            Soon
          </span>
        )}
        {feature.status === "live" && feature.badge && feature.badge > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-coral text-white">
            {feature.badge}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{feature.body}</p>
    </div>
  );

  if (feature.href) {
    return (
      <a href={feature.href} className="block h-full">
        {card}
      </a>
    );
  }
  return card;
}
