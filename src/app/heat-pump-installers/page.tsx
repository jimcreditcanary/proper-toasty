// /heat-pump-installers — UK-wide heat pump installer directory hub.
//
// The front door to the dedicated installer-directory surface. Lists
// featured areas (PILOT_TOWNS for human browsability), explains the
// ranking methodology, the BUS grant context, and the customer
// experience that follows clicking "Request a quote" on any
// installer card. Cross-linked to /heat-pumps/<area> for tech context.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, MapPin, Search } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { PILOT_TOWNS } from "@/lib/programmatic/towns";

const URL = "https://www.propertoasty.com/heat-pump-installers";

export const metadata: Metadata = {
  title:
    "MCS-certified heat pump installers in the UK — Propertoasty directory",
  description:
    "Find MCS-certified, BUS-registered heat pump installers covering every UK postcode. Distance-ranked with Google verified reviews. Request a quote in 5 minutes.",
  alternates: { canonical: URL },
  openGraph: {
    title: "MCS-certified heat pump installers in the UK",
    description:
      "Directory of 5,500+ MCS-certified heat pump installers. Distance-ranked with Google verified reviews.",
    type: "website",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

// Featured areas — PILOT_TOWNS gives us 52 hand-curated entries with
// good display names + deep area-page coverage. Ordered roughly by
// population for the visual scan.
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
  // Fall back to first N PILOT_TOWNS if any featured slugs are missing.
  if (out.length < 12) {
    for (const t of PILOT_TOWNS) {
      if (out.find((a) => a.slug === t.slug)) continue;
      out.push({ slug: t.slug, name: t.name, region: t.region });
      if (out.length >= 16) break;
    }
  }
  return out;
}

export default function HeatPumpInstallersHubPage() {
  const featured = featuredAreas();

  return (
    <AEOPage
      headline="MCS-certified heat pump installers in the UK"
      description="Find MCS-certified, BUS-registered heat pump installers covering every UK postcode. Distance-ranked with Google verified reviews."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Directory · Heat pump installers"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Heat pump installers" },
      ]}
      directAnswer="Propertoasty's directory covers 5,500+ MCS-certified heat pump installers across England and Wales. Pick your area below to see installers ranked by distance, with Google verified review counts and Boiler Upgrade Scheme registration status. Every installer here can apply the £7,500 BUS grant to your install. To get a quote, click any installer and run our free 5-minute property check first — we never share your contact details until you opt in."
      tldr={[
        "5,500+ MCS-certified heat pump installers indexed across England + Wales.",
        "All BUS-registered — can apply the £7,500 Boiler Upgrade Scheme grant.",
        "Google verified ratings on installer cards (refreshed every 30 days).",
        "Distance-ranked from your area. Pick a town below or run our free property check for an exact-postcode match.",
        "Contact details stay private until you opt in — we never auto-share with installers.",
      ]}
      faqs={[
        {
          question: "What is an MCS-certified installer?",
          answer:
            "MCS (Microgeneration Certification Scheme) is the UK's quality assurance scheme for low-carbon heat and power technologies. An MCS-certified heat pump installer has met the scheme's competence requirements, follows MCS installation standards (MIS 3005 for ASHP), and registers each install on the MCS database. Crucially, MCS certification is required for any property to receive the £7,500 Boiler Upgrade Scheme grant — Ofgem only pays the grant if the installer holds active MCS status at the point of install.",
        },
        {
          question: "How are installers ranked on Propertoasty?",
          answer:
            "We geo-filter by straight-line distance from your area's centroid (town centre, local authority centre, or postcode district centre depending on which page you're on), widening the radius automatically when installer density is low so the section doesn't render empty. We then rank by a Bayesian-smoothed Google review score — installers with very few reviews are damped toward the national average so a 5★/3 doesn't beat a 4.8★/200. Distance is the tie-break. Sponsored installers (clearly flagged with a 'Sponsored' badge) float to the top of the list; the same Bayesian ranking applies between them, and they pay double credits per accepted lead in exchange for the placement. We never fabricate ratings — Google verified reviews are shown when available, otherwise no stars row.",
        },
        {
          question: "Why do you ask me to do a property check first?",
          answer:
            "Two reasons. (1) For the homeowner — heat pumps don't suit every property. The 5-minute check uses your EPC, Google's Solar API, and our floorplan analysis to give you a fit assessment BEFORE you spend an installer's time. About 15% of homes that start the check find out they need fabric work first — saving them and the installer a wasted site visit. (2) For the installer — they want qualified leads with property context, not blind enquiries. The check produces an installer-ready report that arrives with the booking, so the first conversation is about the install, not about discovery.",
        },
        {
          question: "What happens to my contact details?",
          answer:
            "Nothing automatic. You enter your contact details during the property check; we use them to send your report to you. The installer you picked DOES see your details once you book a meeting with them — explicit opt-in. We never spam installers with your details, never auto-share, never sell your data. Full privacy policy at /privacy.",
        },
        {
          question: "How do you make money if you're free for homeowners?",
          answer:
            "Installers pay a small per-lead fee when a homeowner books a meeting with them. Roughly £20-£50 per booked meeting depending on the technology. This is a fraction of what installers spend on traditional lead-gen channels (Google Ads, Checkatrade subscriptions, lead-broker fees), and they get fully-qualified leads with property data + photo, so the economics work for them. Free for homeowners; sustainable for the platform.",
        },
        {
          question: "What if there's no installer covering my postcode?",
          answer:
            "For most UK postcodes there are 3-10 MCS-certified installers within a 25 km radius. Rural areas (mid-Wales, Lake District, parts of Scotland) sometimes have lower density — we widen the search radius automatically up to 200 km, so installers willing to cover that area still appear. If absolutely none are found, the page tells you and routes you to the property check, where we'll search live against the MCS directory for any installer covering your specific postcode.",
        },
      ]}
      sources={[
        {
          name: "MCS — Microgeneration Certification Scheme",
          url: "https://mcscertified.com/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
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
              Run our free 5-minute property check. We&rsquo;ll match you
              with installers covering your exact postcode + assess
              whether your home is suitable for a heat pump in the first
              place.
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
        Propertoasty&rsquo;s heat pump installer directory is built
        from the official MCS-certified register (
        <a
          href="https://mcscertified.com/find-an-installer/"
          target="_blank"
          rel="noopener noreferrer"
        >
          mcscertified.com
        </a>
        ), updated monthly. We filter to installers approved for
        air-source heat pumps (the dominant residential technology)
        who are BUS-registered — meaning they can apply the £7,500
        Boiler Upgrade Scheme grant directly to your install
        invoice.
      </p>
      <p>
        Each installer card shows: MCS certificate number,
        BUS-registered status, years in business (where Companies
        House data is available), Google verified reviews (when
        a Google Business listing exists), and a Checkatrade
        verification link-out (when present). Sponsored installers
        are clearly flagged with a &ldquo;Sponsored&rdquo; badge.
        We don&rsquo;t fabricate ratings — if Google has no data
        for an installer, we simply don&rsquo;t show a stars row.
      </p>

      <h2>Browse by area</h2>
      <p>
        Pick a town below to see MCS-certified heat pump installers
        covering that area. For a more granular search (postcode
        district level), use the free property check.
      </p>

      <ul className="not-prose mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {featured.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/heat-pump-installers/${a.slug}`}
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
        <a href="/check">free property check</a> and we&rsquo;ll match
        you with installers covering your exact postcode — including
        in rural areas where we&rsquo;ve widened the search radius
        automatically.
      </p>

      <h2>What makes a good heat pump installer</h2>
      <p>
        Beyond MCS certification, four signals are worth weighing
        when comparing installers:
      </p>
      <ul>
        <li>
          <strong>BUS registration.</strong>{" "}
          <ShieldCheck
            className="inline w-4 h-4 text-coral align-text-bottom"
            aria-hidden
          />{" "}
          Required for the £7,500 grant — non-negotiable. Every
          installer in this directory is BUS-registered.
        </li>
        <li>
          <strong>Years in business.</strong>{" "}
          <MapPin
            className="inline w-4 h-4 text-coral align-text-bottom"
            aria-hidden
          />{" "}
          A 3+ year track record means the company has weathered
          at least one heating season and one BUS application
          cycle. Younger firms can be excellent but offer less
          historical data to assess.
        </li>
        <li>
          <strong>Google review depth.</strong> A 4.5+ rating across
          20+ reviews is a much stronger signal than 5.0 across 2
          reviews. The number of reviews matters as much as the
          score.
        </li>
        <li>
          <strong>Specialism match.</strong> An installer who fits
          only air-source heat pumps may be more focused than one
          who does ASHP + GSHP + solar PV + biomass + battery
          storage. Specialists often have shorter install timelines
          and more confident sizing decisions.
        </li>
      </ul>

      <h2>The customer journey explained</h2>
      <p>
        When you click &ldquo;Request a quote&rdquo; on any
        installer card:
      </p>
      <ol>
        <li>
          We take you into a 5-minute property check (your address,
          a quick floorplan upload, a couple of questions about your
          existing heating).
        </li>
        <li>
          We generate a free personalised report — suitability
          verdict, sizing range, EPC context, BUS grant
          eligibility.
        </li>
        <li>
          If the report says you&rsquo;re a fit, we offer to share
          your report + contact details with the installer you
          picked, and you book a meeting with them directly.
          We never share before that opt-in.
        </li>
      </ol>
      <p>
        Read more on{" "}
        <a href="/guides/mcs-site-visit-what-to-expect">
          what to expect at an MCS site visit
        </a>{" "}
        and the{" "}
        <a href="/guides/bus-application-walkthrough">
          BUS grant application walkthrough
        </a>
        .
      </p>

      <h2>For technology context</h2>
      <p>
        This page focuses on finding an installer. For deeper
        context on the heat-pump technology itself (running costs,
        sizing, fabric prerequisites, smart-tariff setup), see:
      </p>
      <ul>
        <li>
          <a href="/guides">All guides</a> — homeowner walkthroughs
        </li>
        <li>
          <a href="/compare/heat-pump-vs-gas-boiler">
            Heat pump vs gas boiler
          </a>{" "}
          comparison
        </li>
        <li>
          <a href="/guides/heat-pump-running-costs-vs-gas">
            Heat pump vs gas running costs
          </a>{" "}
          worked examples
        </li>
        <li>
          <a href="/guides/fabric-first-retrofit-before-heat-pump">
            Fabric-first retrofit before a heat pump
          </a>
        </li>
      </ul>
    </AEOPage>
  );
}
