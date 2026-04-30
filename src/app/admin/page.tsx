import { PortalShell } from "@/components/portal-shell";
import {
  BarChart3,
  FileText,
  Newspaper,
  Users,
  type LucideIcon,
} from "lucide-react";

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
}

const FEATURES: FeatureCard[] = [
  {
    title: "User management",
    body: "Add and edit users, block accounts, promote installers to admins.",
    icon: Users,
    status: "coming-soon",
  },
  {
    title: "Performance dashboard",
    body: "Credit purchases, credit consumption, lead match rates — filterable by month or all-time.",
    icon: BarChart3,
    status: "coming-soon",
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
    body: "Search every report by address, email, phone, name or 6-character ID.",
    icon: FileText,
    status: "coming-soon",
  },
];

export default function AdminHomePage() {
  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Welcome back"
      pageSubtitle="Manage users, watch performance, and keep the directory honest."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
