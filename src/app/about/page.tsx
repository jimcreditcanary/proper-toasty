// /about — short company / mission page.
//
// Lighter than the homepage, focused on "what is Propertoasty + why
// does it exist". Useful landing for press, partners, and curious
// users following a link from a research piece.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/about";

export const metadata: Metadata = {
  title: "About Propertoasty — UK heat pump + solar suitability service",
  description:
    "Propertoasty is the UK home energy suitability service. We combine the GOV.UK EPC Register, Google's Solar API, and machine-vision floorplan analysis to produce installer-ready reports for homeowners considering heat pumps or solar PV.",
  alternates: { canonical: URL },
  openGraph: {
    title: "About Propertoasty",
    description:
      "UK home energy suitability service combining EPC, Solar API, and floorplan analysis.",
    type: "website",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
  },
};

export default function AboutPage() {
  return (
    <AEOPage
      headline="About Propertoasty"
      description="UK home energy suitability service. We combine the GOV.UK EPC Register, Google's Solar API, and floorplan analysis to produce installer-ready reports for homeowners considering heat pumps or solar PV."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="About"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "About" },
      ]}
      directAnswer="Propertoasty is a UK home energy suitability service. We help homeowners decide whether their home is right for a heat pump or solar PV install — and match them with MCS-certified installers covering their postcode. The free 5-minute check combines the GOV.UK EPC Register, Google's Solar API, and machine-vision floorplan analysis into a single installer-ready report. We make money when installers pay a small per-lead fee; never from homeowners."
      tldr={[
        "Service: free UK home suitability check for heat pumps + solar PV.",
        "Data: EPC Register + Google Solar API + Anthropic Claude floorplan vision.",
        "Output: installer-ready report + match to MCS-certified installers covering your postcode.",
        "Business model: installers pay per booked meeting; homeowners pay nothing.",
        "Operated by Credit Canary Ltd. Built by Jim Fell + a small team.",
      ]}
      sources={[
        {
          name: "GOV.UK — Find an Energy Performance Certificate",
          url: "https://find-energy-certificate.service.gov.uk/",
          accessedDate: "May 2026",
        },
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
      ]}
    >
      <h2>What we do</h2>
      <p>
        Propertoasty helps UK homeowners make confident decisions
        about heat pumps and solar PV. The free 5-minute check
        takes your address; pulls your EPC, runs Google&rsquo;s
        Solar API against your roof, and (optionally) analyses an
        uploaded floorplan via Anthropic Claude vision. The output
        is a personalised report covering:
      </p>
      <ul>
        <li>Heat pump suitability + sizing range + BUS grant eligibility</li>
        <li>Solar PV system size + expected output + payback</li>
        <li>EPC band + recommended improvements + cost ranges</li>
        <li>Matched MCS-certified installers covering your postcode</li>
      </ul>

      <h2>Why we built it</h2>
      <p>
        UK homeowners deciding on low-carbon heating face the
        hardest information-asymmetry problem in the property
        market. The technologies are unfamiliar (heat pumps),
        the grants are confusing (BUS, ECO4, GBIS), the
        installer market is fragmented (5,500+ MCS firms with
        wildly variable practice), and the cost-of-getting-it-
        wrong is high (oversized heat pumps cost £1,500/yr more
        to run than rightsized ones).
      </p>
      <p>
        Propertoasty exists to compress that information gap into
        a 5-minute check. We bring three otherwise-siloed
        datasets together (EPC, solar irradiance, floorplan) and
        present a single installer-ready report. Installers get
        qualified leads with property context; homeowners get
        clarity without an installer sales call.
      </p>

      <h2>How we make money</h2>
      <p>
        Installers pay a small per-lead fee (~£20-£50) when a
        homeowner books a meeting with them through Propertoasty.
        That&rsquo;s a fraction of what installers spend on
        traditional lead-gen channels (Google Ads, Checkatrade
        subscriptions, lead-broker fees), and the leads come with
        property data attached, so the economics work for them.
      </p>
      <p>
        <strong>Homeowners pay nothing.</strong> We don&rsquo;t
        sell your data. We never share your contact details with
        an installer until you explicitly book a meeting.
      </p>

      <h2>How we&rsquo;re different from Checkatrade / MyBuilder / Bark</h2>
      <p>
        Traditional directories list traders and let homeowners
        contact them directly. That&rsquo;s great for plumbers
        and electricians where the job spec is obvious — &ldquo;my
        boiler is leaking&rdquo; — but it&rsquo;s the wrong shape
        for heat pump and solar installs, where the right answer
        depends on data the homeowner doesn&rsquo;t have (heat-loss
        kW, roof segments, EPC recommendations to clear).
      </p>
      <p>
        Propertoasty inverts the model: we collect the technical
        data first, generate a report, and then connect the
        homeowner to an installer who can see the report on day
        one. Installers stop spending the first three visits on
        discovery; homeowners stop wasting visits on the wrong
        technology. The 5-minute check is the wedge.
      </p>

      <h2>The data sources we use</h2>
      <ul>
        <li>
          <strong>GOV.UK EPC Register.</strong> Every certificate
          lodged in England + Wales. Refreshed monthly. Used for
          property-level suitability + the{" "}
          <Link href="/research/epc-index-2026-q2">
            quarterly EPC Index research
          </Link>
          .
        </li>
        <li>
          <strong>Google Solar API.</strong> High-resolution roof
          segmentation, panel placement, annual irradiance. Used
          to size solar PV systems.
        </li>
        <li>
          <strong>Anthropic Claude vision.</strong> Floorplan
          analysis to estimate room counts, floor area, and
          heating-load proxies.
        </li>
        <li>
          <strong>MCS-certified register.</strong> 5,500+ installer
          records, monthly refresh from mcscertified.com.
        </li>
        <li>
          <strong>Companies House.</strong> Years-in-business signal
          for installer profiles.
        </li>
        <li>
          <strong>Google Places API.</strong> Verified Google
          reviews for installer cards (refreshed on-demand, 30-day
          cache).
        </li>
      </ul>

      <h2>The people behind Propertoasty</h2>
      <p>
        Propertoasty is built by Jim Fell and operated by Credit
        Canary Ltd. Jim previously built and ran Credit Canary, a
        UK fintech. He started Propertoasty after spending three
        years watching homeowners get lost between energy-upgrade
        decisions and the MCS installer market.
      </p>
      <p>
        Read more on <Link href="/authors/jim-fell">Jim&rsquo;s author page</Link>{" "}
        or browse our <Link href="/authors">authors index</Link>.
      </p>

      <h2>Get in touch</h2>
      <ul>
        <li>
          <Link href="/check">Free property check</Link> — the fastest
          path to a personalised report
        </li>
        <li>
          <Link href="/installers">Find an MCS-certified installer</Link>{" "}
          — browse the directory by area
        </li>
        <li>
          <Link href="/contact">Contact</Link> — homeowner enquiries,
          installer onboarding, press
        </li>
        <li>
          <Link href="/research">Research</Link> — published data + EPC
          Index quarterly reports
        </li>
      </ul>

      <p>
        <Link
          href="/check"
          className="inline-flex items-center gap-1.5 mt-4 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm h-10 px-5 transition-colors no-underline"
        >
          Run the free property check
          <ArrowRight className="w-4 h-4" />
        </Link>
      </p>
    </AEOPage>
  );
}
