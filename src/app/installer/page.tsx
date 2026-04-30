import { PortalShell } from "@/components/portal-shell";
import {
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
    status: "coming-soon",
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
    body: "30 / 100 / 250 / 1,000 credit packs. Auto-recharge available.",
    icon: CreditCard,
    status: "coming-soon",
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

export default function InstallerHomePage() {
  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Welcome back"
      pageSubtitle="Manage your availability, accept leads, and quote with confidence."
    >
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
