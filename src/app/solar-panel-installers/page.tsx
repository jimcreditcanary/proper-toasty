// /solar-panel-installers — UK-wide solar PV installer directory hub.
//
// Sister to /heat-pump-installers. Same structure, solar-flavoured
// copy and methodology (SEG instead of BUS as the primary scheme
// signal).

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, MapPin, Search } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { PILOT_TOWNS } from "@/lib/programmatic/towns";

const URL = "https://www.propertoasty.com/solar-panel-installers";

export const metadata: Metadata = {
  title:
    "MCS-certified solar panel installers in the UK — Propertoasty directory",
  description:
    "Find MCS-certified solar PV installers covering every UK postcode. Distance-ranked with Google verified reviews. Request a quote in 5 minutes.",
  alternates: { canonical: URL },
  openGraph: {
    title: "MCS-certified solar panel installers in the UK",
    description:
      "Directory of MCS-certified solar PV installers. Distance-ranked with Google verified reviews.",
    type: "website",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
  },
};

const FEATURED_TOWN_SLUGS = [
  "manchester",
  "birmingham",
  "leeds",
  "sheffield",
  "bristol",
  "liverpool",
  "newcastle-upon-tyne",
  "nottingham",
  "cardiff",
  "leicester",
  "southampton",
  "brighton",
  "plymouth",
  "york",
  "oxford",
  "cambridge",
];

interface FeaturedArea {
  slug: string;
  name: string;
  region: string;
}

function featuredAreas(): FeaturedArea[] {
  const out: FeaturedArea[] = [];
  for (const slug of FEATURED_TOWN_SLUGS) {
    const town = PILOT_TOWNS.find((t) => t.slug === slug);
    if (town) out.push({ slug, name: town.name, region: town.region });
  }
  if (out.length < 12) {
    for (const t of PILOT_TOWNS) {
      if (out.find((a) => a.slug === t.slug)) continue;
      out.push({ slug: t.slug, name: t.name, region: t.region });
      if (out.length >= 16) break;
    }
  }
  return out;
}

export default function SolarPanelInstallersHubPage() {
  const featured = featuredAreas();

  return (
    <AEOPage
      headline="MCS-certified solar panel installers in the UK"
      description="Find MCS-certified solar PV installers covering every UK postcode. Distance-ranked with Google verified reviews."
      url={URL}
      image="/hero-solar.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Directory · Solar panel installers"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Solar panel installers" },
      ]}
      directAnswer="Propertoasty's directory covers MCS-certified solar PV installers across England and Wales. Pick your area below to see installers ranked by distance, with Google verified review counts. MCS certification is required for Smart Export Guarantee eligibility — every installer here can register your system for the SEG export tariff. To get a quote, click any installer and run our free 5-minute property check first."
      tldr={[
        "MCS-certified solar PV installers indexed across England + Wales.",
        "MCS certification required for Smart Export Guarantee (SEG) eligibility.",
        "Google verified ratings on installer cards (refreshed every 30 days).",
        "Distance-ranked from your area. Pick a town below or run our free check for an exact-postcode match.",
        "Contact details stay private until you opt in — we never auto-share with installers.",
      ]}
      faqs={[
        {
          question:
            "Why does my solar installer need to be MCS-certified?",
          answer:
            "MCS (Microgeneration Certification Scheme) certification is required for two things: (1) eligibility for the Smart Export Guarantee — the scheme that pays you per kWh exported to the grid; (2) most home insurance and mortgage lenders treat MCS-installed solar as standard, whereas non-MCS installs sometimes trigger insurance and disclosure complications. An MCS-certified installer follows MIS 3002 for solar PV installs and registers each install on the MCS database, which Ofgem and your electricity supplier use to confirm SEG eligibility.",
        },
        {
          question: "How are installers ranked on Propertoasty?",
          answer:
            "We geo-filter by straight-line distance from your area's centroid (town centre, local authority centre, or postcode district centre depending on which page you're on), widening the radius automatically when installer density is low so the section doesn't render empty. We then rank by a Bayesian-smoothed Google review score — installers with very few reviews are damped toward the national average so a 5★/3 doesn't beat a 4.8★/200. Distance is the tie-break. Sponsored installers (clearly flagged with a 'Sponsored' badge) float to the top of the list; the same Bayesian ranking applies between them, and they pay double credits per accepted lead in exchange for the placement. We never fabricate ratings.",
        },
        {
          question: "What's a typical solar PV install cost in 2026?",
          answer:
            "Typical UK 2026 prices: £4,000-£8,000 for a 3.5-5 kW system without battery, £6,500-£10,500 with a 5 kWh battery, £9,000-£14,000 for a fully-loaded system with 10 kWh+ battery and EV-ready inverter. Three factors drive most of the spread: roof complexity (single-aspect roof is cheapest), inverter location (loft is cheapest), and scaffolding access. Solar PV installs qualify for 0% VAT through to March 2027.",
        },
        {
          question: "What happens to my contact details?",
          answer:
            "Nothing automatic. You enter your contact details during the property check; we use them to send your report to you. The installer you picked DOES see your details once you book a meeting with them — explicit opt-in. We never spam installers with your details, never auto-share, never sell your data. Full privacy policy at /privacy.",
        },
        {
          question: "How do you make money if you're free for homeowners?",
          answer:
            "Installers pay a small per-lead fee when a homeowner books a meeting with them. Roughly £20-£50 per booked meeting depending on the technology. This is a fraction of what installers spend on traditional lead-gen channels (Google Ads, Checkatrade subscriptions, lead-broker fees), and they get fully-qualified leads with property data + Google Solar API roof analysis, so the economics work for them.",
        },
      ]}
      sources={[
        {
          name: "MCS — Microgeneration Certification Scheme",
          url: "https://mcscertified.com/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Smart Export Guarantee (SEG)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Solar PV permitted development rules",
          url: "https://www.planningportal.co.uk/permission/common-projects/solar-panels",
          accessedDate: "May 2026",
        },
        {
          name: "Google Maps Platform — Places API",
          url: "https://developers.google.com/maps/documentation/places/web-service/overview",
          accessedDate: "May 2026",
        },
      ]}
    >
      {/* Postcode quick-search prompt → routes to /check, which handles
          postcode → MCS-directory live search. */}
      <div className="not-prose rounded-2xl border border-[var(--border)] bg-white p-6 mb-10">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className="shrink-0 w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center"
          >
            <Search className="w-5 h-5 text-coral" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-navy m-0">
              Looking for installers near a specific postcode?
            </h2>
            <p className="text-sm text-slate-600 mt-1 mb-3 leading-relaxed">
              Run our free 5-minute property check. We&rsquo;ll match
              you with installers covering your exact postcode + assess
              your roof using Google&rsquo;s Solar API to estimate
              system size and payback.
            </p>
            <Link
              href="/check"
              className="inline-flex items-center gap-1.5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm h-10 px-5 transition-colors"
            >
              Start the free property check
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <h2>About the directory</h2>
      <p>
        Propertoasty&rsquo;s solar PV installer directory is built
        from the official MCS-certified register (
        <a
          href="https://mcscertified.com/find-an-installer/"
          target="_blank"
          rel="noopener noreferrer"
        >
          mcscertified.com
        </a>
        ), updated monthly. We filter to installers approved for
        solar PV (cap_solar_pv = true). MCS certification is the
        gate for Smart Export Guarantee eligibility — without it,
        your electricity supplier can&rsquo;t register your system
        for the export tariff.
      </p>
      <p>
        Each installer card shows: MCS certificate number, years
        in business (where Companies House data is available),
        Google verified reviews (when a Google Business listing
        exists), and a Checkatrade verification link-out (when
        present). Sponsored installers are clearly flagged with a
        &ldquo;Sponsored&rdquo; badge. We don&rsquo;t fabricate
        ratings — if Google has no data for an installer, we
        simply don&rsquo;t show a stars row.
      </p>

      <h2>Browse by area</h2>
      <p>
        Pick a town below to see MCS-certified solar panel
        installers covering that area. For postcode-level
        matching, use the free property check.
      </p>

      <ul className="not-prose mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {featured.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/solar-panel-installers/${a.slug}`}
              className="group block rounded-xl border border-[var(--border)] bg-white p-4 hover:border-coral hover:shadow-sm transition-all"
            >
              <p className="text-sm font-medium text-navy group-hover:text-coral transition-colors">
                {a.name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{a.region}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs text-coral">
                Find installers
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-slate-600">
        Not your town? Run the{" "}
        <a href="/check">free property check</a> and we&rsquo;ll
        match you with installers covering your exact postcode.
      </p>

      <h2>What makes a good solar PV installer</h2>
      <p>
        Beyond MCS certification, four signals are worth weighing
        when comparing solar installers:
      </p>
      <ul>
        <li>
          <strong>MCS + RECC.</strong>{" "}
          <ShieldCheck
            className="inline w-4 h-4 text-coral align-text-bottom"
            aria-hidden
          />{" "}
          MCS certification covers technical quality; the Renewable
          Energy Consumer Code (RECC) covers consumer protection.
          The best installers hold both.
        </li>
        <li>
          <strong>Years in business.</strong>{" "}
          <MapPin
            className="inline w-4 h-4 text-coral align-text-bottom"
            aria-hidden
          />{" "}
          Solar tech is more mature than heat pumps; 5+ years of
          install history is a strong signal that the firm honours
          its 25-year panel + 10-year inverter warranties.
        </li>
        <li>
          <strong>In-house electrical team.</strong> Solar installs
          require qualified electrical work; firms that subcontract
          the electrical side can run into G98/G99 DNO sign-off
          delays. In-house electricians shorten the timeline.
        </li>
        <li>
          <strong>Battery storage capability.</strong> If you might
          add a battery later, picking an installer who fits both
          (cap_battery_storage = true) means a single system design
          rather than two contractors.
        </li>
      </ul>

      <h2>The customer journey explained</h2>
      <p>
        When you click &ldquo;Request a quote&rdquo; on any
        installer card:
      </p>
      <ol>
        <li>
          We take you into a 5-minute property check — your
          address, roof analysis via Google&rsquo;s Solar API, a
          quick question about your electricity consumption.
        </li>
        <li>
          We generate a free personalised report — usable roof
          area, suggested system size, expected kWh/year output,
          payback period, SEG tariff comparison.
        </li>
        <li>
          If the report says you&rsquo;re a fit, we offer to share
          your report + contact details with the installer you
          picked, and you book a meeting with them directly. We
          never share before that opt-in.
        </li>
      </ol>

      <h2>For technology context</h2>
      <p>
        This page focuses on finding an installer. For deeper
        context on solar PV (panel choice, SEG tariffs, system
        sizing), see:
      </p>
      <ul>
        <li>
          <a href="/guides">All guides</a> — homeowner walkthroughs
        </li>
        <li>
          <a href="/compare/solar-with-battery-vs-solar-alone">
            Solar with battery vs solar alone
          </a>{" "}
          comparison
        </li>
        <li>
          <a href="/compare/solar-pv-vs-solar-thermal">
            Solar PV vs solar thermal
          </a>
        </li>
      </ul>
    </AEOPage>
  );
}
