import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";
import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  FileText,
  Inbox,
  KeyRound,
  Send,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Installer portal landing.
//
// Each card is a placeholder for a feature being shipped in subsequent
// PRs. Cards flip to live links as the features land.

interface FeatureCard {
  title: string;
  body: string;
  icon: LucideIcon;
  status: "live" | "coming-soon";
  href?: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: "Availability",
    body: "Set the times you can take site visits. Slots auto-roll forward 28 days.",
    icon: CalendarDays,
    status: "live",
    href: "/installer/availability",
  },
  {
    title: "Leads",
    body: "Accept or reject site-visit requests. 5 credits per accepted lead.",
    icon: Inbox,
    status: "coming-soon",
  },
  {
    title: "Reports",
    body: "View pre-survey reports for everyone you've quoted or been matched with. Search by address, name, email, phone or 6-character ID.",
    icon: FileText,
    status: "coming-soon",
  },
  {
    title: "Send proposal",
    body: "Build a line-item quote and send it to the homeowner from inside the report.",
    icon: Send,
    status: "coming-soon",
  },
  {
    title: "Pre-survey requests",
    body: "Email your customers a personalised link to complete the survey. 1 credit per request.",
    icon: Zap,
    status: "coming-soon",
  },
  {
    title: "Buy credits",
    body: "30 / 100 / 250 / 1,000 credit packs. Auto top-up available.",
    icon: CreditCard,
    status: "live",
    href: "/installer/credits",
  },
  {
    title: "Performance",
    body: "Leads received, quoted, won, with conversion rates by month.",
    icon: TrendingUp,
    status: "coming-soon",
  },
  {
    title: "Billing & receipts",
    body: "VAT receipts for every credit purchase. Downloadable.",
    icon: Wallet,
    status: "coming-soon",
  },
  {
    title: "API access",
    body: "Integrate pre-survey requests into your own systems. POST first name, email, postcode.",
    icon: KeyRound,
    status: "coming-soon",
  },
];

export const dynamic = "force-dynamic";

export default async function InstallerHomePage() {
  // Pull the auto-recharge failure flag so the banner can render.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let failureReason: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("auto_recharge_failed_at, auto_recharge_failure_reason")
      .eq("id", user.id)
      .maybeSingle<{
        auto_recharge_failed_at: string | null;
        auto_recharge_failure_reason: string | null;
      }>();
    if (profile?.auto_recharge_failed_at) {
      failureReason = profile.auto_recharge_failure_reason ?? "Card declined";
    }
  }

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Welcome back"
      pageSubtitle="Manage your availability, accept leads, and quote with confidence."
    >
      {failureReason && (
        <Link
          href="/installer/credits"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                Auto top-up didn&rsquo;t go through
              </p>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                {failureReason}
              </p>
              <p className="text-xs text-amber-800 mt-1.5 font-medium">
                Top up manually to keep accepting leads →
              </p>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
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
