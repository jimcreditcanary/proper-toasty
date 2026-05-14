// /installers — combined MCS installer directory hub.
//
// Front door for "find an installer" intent. Routes users to either
// /heat-pump-installers or /solar-panel-installers depending on the
// technology they're researching. Also catches the redirects from
// /find-installer, /find-an-installer, /find-installers (configured
// in next.config.ts).

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Sun, Search } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/installers";

export const metadata: Metadata = {
  title:
    "Find an MCS-certified UK installer — Propertoasty directory",
  description:
    "Find an MCS-certified UK installer for heat pumps or solar PV. 5,500+ installers, distance-ranked, with Google verified reviews. Free 5-minute property check matches you with installers covering your exact postcode.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Find an MCS-certified UK installer",
    description:
      "Heat pump or solar — find MCS-certified installers near you, with Google verified reviews.",
    type: "website",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function InstallersHubPage() {
  return (
    <AEOPage
      headline="Find an MCS-certified UK installer"
      description="Heat pump or solar — find MCS-certified installers near you, with Google verified reviews + BUS grant registration status."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Directory"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Installers" },
      ]}
      directAnswer="Propertoasty indexes 5,500+ MCS-certified UK installers across heat pumps and solar PV. Pick the technology you're researching — heat pumps for low-carbon home heating, or solar PV for rooftop electricity generation. Both directories rank installers by distance from your area, with Google verified reviews, MCS certificate numbers, and scheme-eligibility flags (BUS for heat pumps, Smart Export Guarantee for solar)."
      tldr={[
        "5,500+ MCS-certified installers across heat pumps and solar PV.",
        "MCS = the UK quality scheme required for BUS grant + SEG export tariff eligibility.",
        "Distance-ranked from your area. Google verified reviews when current.",
        "Pick a technology below — heat pump directory or solar directory.",
        "Or run the free property check to get a postcode-specific match across both technologies.",
      ]}
      sources={[
        {
          name: "MCS — Microgeneration Certification Scheme",
          url: "https://mcscertified.com/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme (BUS) for heat pumps",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Smart Export Guarantee (SEG) for solar",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
      ]}
    >
      <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <Link
          href="/heat-pump-installers"
          className="group rounded-2xl border border-[var(--border)] bg-white p-6 hover:border-coral hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-coral" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-navy m-0">
                Heat pump installers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Air-source + ground-source · BUS grant eligible
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            MCS-certified, BUS-registered heat pump installers. The
            £7,500 Boiler Upgrade Scheme grant applies to your install
            via the installer. Browse by town or run the free property
            check.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2 transition-all">
            Browse heat pump installers
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/solar-panel-installers"
          className="group rounded-2xl border border-[var(--border)] bg-white p-6 hover:border-coral hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center">
              <Sun className="w-6 h-6 text-coral" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-navy m-0">
                Solar panel installers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Solar PV + battery storage · SEG eligible
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            MCS-certified solar PV installers. MCS certification is
            required for Smart Export Guarantee eligibility — the
            scheme that pays you per kWh exported to the grid.
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2 transition-all">
            Browse solar installers
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

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
              Not sure which technology fits?
            </h2>
            <p className="text-sm text-slate-600 mt-1 mb-3 leading-relaxed">
              Run the free 5-minute property check. We assess your
              home for both heat pump AND solar PV suitability using
              your EPC + Google&rsquo;s Solar API + floorplan
              analysis, then match you with installers covering
              your specific postcode.
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

      <h2>Why MCS certification matters</h2>
      <p>
        MCS (the Microgeneration Certification Scheme) is the UK
        quality assurance scheme for low-carbon heat and power
        technologies. We only index MCS-certified installers
        because:
      </p>
      <ul>
        <li>
          <strong>BUS grant eligibility.</strong> The £7,500 Boiler
          Upgrade Scheme grant for heat pumps requires the
          installer to hold active MCS certification. No
          certification = no grant.
        </li>
        <li>
          <strong>SEG eligibility.</strong> The Smart Export
          Guarantee for solar PV requires MCS-certified install
          for your electricity supplier to register you for export
          payments.
        </li>
        <li>
          <strong>Insurance + mortgage friendliness.</strong> Most
          home insurance and mortgage lenders treat MCS-installed
          systems as standard equipment; non-MCS installs sometimes
          trigger disclosure complications.
        </li>
        <li>
          <strong>Standards compliance.</strong> MCS installers
          follow defined installation standards (MIS 3005 for heat
          pumps, MIS 3002 for solar PV) and register each install
          on the MCS database. Failure to comply has reputational
          + commercial consequences for the installer.
        </li>
      </ul>

      <h2 id="how-we-rank">How we rank installers</h2>
      <p>
        Both directories use the same ranking method:
      </p>
      <ol>
        <li>
          Filter to MCS-certified installers approved for the
          relevant technology (heat pump or solar PV).
        </li>
        <li>
          For heat pumps: additionally filter to BUS-registered.
        </li>
        <li>
          Geo-filter by straight-line distance from the area
          centroid you searched. The radius widens automatically
          (25 km → 50 → 100 → 200 km) when installer density is
          low so rural postcodes don&rsquo;t render an empty
          section.
        </li>
        <li>
          Rank by a Bayesian-smoothed Google review score —
          installers with very few reviews are damped toward the
          national average so a 5★/3 doesn&rsquo;t beat a 4.8★/200.
          Installers without a Google Business listing rank at the
          national average and don&rsquo;t display a stars row
          (no fabricated stars).
        </li>
        <li>
          Distance is the tie-break when scores are close.
        </li>
      </ol>
      <h3>Sponsored placement</h3>
      <p>
        We offer a paid &ldquo;sponsored placement&rdquo; option.
        Sponsored installers float to the top of the directory and
        are clearly flagged with a{" "}
        <strong>Sponsored</strong> badge on their card — the same
        Bayesian ranking applies between sponsored installers, so
        a 5★/3 sponsored installer still sits below a 4.8★/200
        sponsored installer. Sponsored installers pay double credits
        per accepted lead in exchange for the placement; the
        homeowner journey + reviews shown are otherwise identical.
        See <Link href="/pricing">pricing</Link> for the full
        breakdown.{" "}
        <Link href="/contact">Contact us</Link> if you have feedback
        on a specific listing.
      </p>

      <h2>For installers</h2>
      <p>
        If you&rsquo;re an MCS-certified installer and your listing
        is missing or out of date, get in touch via{" "}
        <Link href="/installer-signup">/installer-signup</Link>{" "}
        or email{" "}
        <a href="mailto:installers@propertoasty.com">
          installers@propertoasty.com
        </a>
        . We update the directory monthly from the MCS register;
        between refreshes you can claim + update your listing
        directly via the installer portal.
      </p>
    </AEOPage>
  );
}
