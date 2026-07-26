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
        "Install cost: £4,000–£8,000 for a typical UK home, £6,500–£12,500 with a home battery.",
        "No planning permission for most UK homes — solar counts as a normal home improvement.",
        "Every major energy supplier will pay you for extra electricity you sell back to the grid.",
        "Payback: 6–11 years on a south-facing roof at UK electricity prices.",
        "A properly qualified installer is required to get the payback scheme going.",
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
          name: "Ofgem — Smart Export Guarantee (SEG)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Solar PV permitted development rules",
          url: "https://www.gov.uk/guidance/when-is-permission-required",
          accessedDate: "May 2026",
        },
      ]}
    >
      {/* Plug-in solar callout — sits high on the hub because the
          audience it targets (renters, flat-dwellers, no-roof homes)
          will bounce off "how solar PV works on UK roofs" without
          this signpost. Added 25 July 2026 after BS 7671 Amendment 4
          legalised UK plug-in solar. */}
      <aside
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem 1.5rem",
          background: "var(--cream-deep, #f5efe6)",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#c85a3e", margin: 0 }}>
          Can&rsquo;t fit rooftop?
        </p>
        <p style={{ marginTop: "0.35rem", marginBottom: "0.35rem" }}>
          <strong>Plug-in solar is now legal in the UK.</strong> 800 W
          kits from £400, no installer needed, works for renters and
          flats.{" "}
          <a href="/plug-in-solar">
            Read the UK plug-in solar guide →
          </a>
        </p>
      </aside>

      <h2>How solar panels work on UK roofs</h2>
      <p>
        A typical UK solar install puts 10 to 14 panels on the roof
        — enough to cover most of a family&rsquo;s daytime electricity
        use. How much they generate over the year depends on which
        way the roof faces, its angle, and any shading. A south-
        facing roof in southern England generates roughly 3,400 units
        of electricity a year; the same system in northern Scotland
        does about 15% less. Around half of what you generate gets
        used in the home directly (worth 25–35p per unit you avoid
        buying), and about half gets sold back to the grid (worth 3
        to 15p per unit, depending on your energy supplier).
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
        Town pages give the local picture; whether solar pays back
        on your specific home comes down to which way your roof
        faces, how much usable space it has, shading from neighbours
        or trees, and how much electricity you use during the day.
        Our free pre-survey uses satellite imagery of your specific
        roof alongside your energy certificate to size a system and
        estimate payback in about five minutes.
      </p>
      <p>
        <a href="/check">Run a free pre-survey check on your home</a>{" "}
        — number of panels, how much electricity you&rsquo;d generate
        each year, payback in years, and a list of qualified
        installers covering your area.
      </p>
    </AEOPage>
  );
}
