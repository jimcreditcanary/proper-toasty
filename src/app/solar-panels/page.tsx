// /solar-panels — index page for the programmatic town pages under
// /solar-panels/[town-slug]. Twin of /heat-pumps with a solar
// landing + town directory.

import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIndexedTownAggregates } from "@/lib/programmatic/town-aggregates";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

export const revalidate = 3600;

const PAGE_URL = "https://www.propertoasty.com/solar-panels";

export const metadata: Metadata = {
  title: "Solar panels in the UK: 2026 cost + SEG guide by town",
  description:
    "Rooftop solar PV suitability across UK towns, with install cost ranges, payback periods, Smart Export Guarantee context, and live EPC band data per location.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Solar panels in the UK: 2026 cost + SEG guide by town",
    description:
      "Install cost ranges, payback, SEG context + EPC data by UK town. Free pre-survey checks for every property.",
    type: "website",
    url: PAGE_URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
  },
};

export default async function SolarPanelsIndex() {
  const admin = createAdminClient();
  const towns = await loadIndexedTownAggregates(admin);
  const sorted = [...towns].sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );

  const directAnswer =
    "Rooftop solar PV in the UK costs £4,000 to £8,000 for a typical 3.5–5 kW system, or £6,500 to £10,500 with a 5 kWh battery. Smart Export Guarantee pays 3–15p per kWh exported. Most homes qualify under Permitted Development, no planning application required. Pick your town below for local context, or run a free pre-survey on your address.";

  return (
    <AEOPage
      headline="Solar panels in the UK: 2026 cost + SEG guide by town"
      description="Rooftop solar PV suitability across UK towns, with install cost ranges, payback periods, Smart Export Guarantee context, and live EPC band data per location."
      url={PAGE_URL}
      image="/hero-solar.jpg"
      datePublished="2026-05-11"
      dateModified="2026-05-11"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Solar PV · UK"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Solar panels" },
      ]}
      directAnswer={directAnswer}
      tldr={[
        "Install cost: £4,000–£8,000 for 3.5–5 kW, +£2,500–£4,500 with battery.",
        "Permitted development: covers most UK homes, no planning needed.",
        "Smart Export Guarantee: every major supplier offers an SEG tariff.",
        "Payback: 6–11 years for a south-facing roof on UK electricity prices.",
        "MCS-certified installer required for SEG eligibility + DNO sign-off.",
      ]}
      sources={[
        {
          name: "Ofgem — Smart Export Guarantee (SEG)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Solar panels",
          url: "https://energysavingtrust.org.uk/advice/solar-panels/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Solar PV permitted development rules",
          url: "https://www.gov.uk/guidance/when-is-permission-required",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>How solar PV works on UK roofs</h2>
      <p>
        A typical UK solar PV install puts 10–14 monocrystalline
        panels on the roof, rated 400–440 W each, total 4–5 kW
        peak. Annual output depends on roof orientation, pitch and
        shading: a south-facing roof at 35° pitch in southern
        England generates around 850 kWh per kW per year (so ~3,400
        kWh for a 4 kW system); the same system in northern Scotland
        does about 720 kWh per kW. Half of that output is typically
        used in the home directly (offsetting your electricity bill
        at full retail rate, usually 25–35p/kWh), and half is
        exported (paid at the SEG rate, 3–15p/kWh depending on
        supplier).
      </p>
      <p>
        Adding a battery (typically 5 to 15 kWh) shifts the
        self-consumption share upward — usable solar at night
        instead of selling cheap and buying back expensive. The
        marginal-return point in 2026 sits around the 5 kWh tier:
        smaller batteries don&rsquo;t cover an evening peak; larger
        batteries cost more than the export savings recover.
      </p>

      <h2>Browse by town</h2>
      <p>
        Each town page below carries live EPC band data for the
        area + solar-specific context (roof age, common property
        type, install considerations). Sample size shown next to
        each town. We&rsquo;re expanding coverage steadily —
        if your town isn&rsquo;t listed yet, the suitability checker
        below works for every UK address.
      </p>

      {sorted.length === 0 ? (
        <p className="text-slate-500 italic">
          Town pages are being built — check back shortly.
        </p>
      ) : (
        <ul
          className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3 my-6"
          aria-label="Towns with solar PV guides"
        >
          {sorted.map((t) => (
            <li key={t.scope_key}>
              <Link
                href={`/solar-panels/${t.scope_key}`}
                className="block rounded-xl border border-[var(--border)] bg-white px-4 py-3 hover:border-coral/30 hover:shadow-sm transition-all"
              >
                <span className="block font-semibold text-navy">
                  {t.display_name}
                </span>
                <span className="block text-xs text-slate-500">
                  {t.region} · {t.country} ·{" "}
                  {t.sample_size.toLocaleString("en-GB")} EPCs
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2>Check your specific home</h2>
      <p>
        Town pages give the local context; whether solar PV pays
        back on your specific home comes down to roof orientation,
        usable area, shading from neighbours / trees, and your
        daytime electricity usage. Propertoasty&rsquo;s free
        pre-survey check uses the Google Solar API&rsquo;s
        high-resolution roof segmentation alongside your EPC to
        size a system and estimate payback in about five minutes.
      </p>
      <p>
        <a href="/check">Run a free pre-survey check on your home</a>{" "}
        — panel count, expected kWh/year, payback in years, and a
        list of MCS-certified installers covering your area.
      </p>
    </AEOPage>
  );
}
