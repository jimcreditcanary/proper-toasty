// /compare/air-source-vs-ground-source-heat-pump — comparison page.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/air-source-vs-ground-source-heat-pump";

export const metadata: Metadata = {
  title: "Air source vs ground source heat pump 2026: UK cost + efficiency",
  description:
    "Head-to-head: install cost, SCOP, space required, lifetime cost. Which suits your home + when ground source actually pays back.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Air source vs ground source heat pump 2026: UK cost + efficiency",
    description:
      "Install cost, efficiency (SCOP), space + ground works, payback. Worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function AshpVsGshp() {
  return (
    <AEOPage
      headline="Air source vs ground source heat pump in 2026: which one for a UK home?"
      description="Head-to-head: install cost, SCOP, space required, lifetime cost. Which suits your home + when ground source actually pays back."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-12"
      dateModified="2026-05-12"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heat pump"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Air source vs ground source" },
      ]}
      directAnswer="Air-source heat pumps install for £8,000–£14,000 pre-grant; ground-source costs £18,000–£35,000 because of the borehole or trench. Both qualify for the same £7,500 Boiler Upgrade Scheme grant. Air-source suits roughly 95% of UK homes — faster install, smaller footprint, faster payback. Ground-source pays back in 15+ years on detached properties with land and high heat demand."
      tldr={[
        "Install cost: ASHP £8k–£14k vs GSHP £18k–£35k pre-grant.",
        "Same £7,500 BUS grant on both — so the spread on net cost is even wider.",
        "GSHP wins on efficiency (SCOP 4–5.5 vs 3–4.5 for ASHP).",
        "GSHP needs garden trench or borehole; ASHP needs a 1m² outdoor spot.",
        "ASHP suits 95% of UK homes; GSHP makes sense for off-gas detached + land.",
      ]}
      faqs={[
        {
          question: "Is ground source heat pump better than air source?",
          answer:
            "Ground source is more efficient (SCOP 4–5.5 vs 3–4.5 for air source) and lasts longer (20–25 years for the pump, 50+ for the loop). But the install cost is 2–3× higher because of the borehole or trench. For most UK homes the air-source payback is faster; ground source makes sense for detached properties with land + high heat demand.",
        },
        {
          question: "Can I fit a ground source heat pump in a UK terrace?",
          answer:
            "Practically no. Ground source needs either a horizontal trench (~600 m² of garden) or a borehole (~50–150 m deep). UK terrace gardens are too small for trenches, and boreholes require planning + drilling rig access that isn't viable in most terrace contexts. Air source is the realistic option for terraces.",
        },
        {
          question: "Do both heat pump types get the BUS grant?",
          answer:
            "Yes — the Boiler Upgrade Scheme pays a flat £7,500 toward EITHER an air-source OR ground-source heat pump install in England and Wales. The grant amount doesn't change between technologies. The installer must be MCS-certified and the property must have a valid EPC with insulation recommendations cleared.",
        },
      ]}
      sources={[
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
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Air source vs ground source heat pump — typical UK numbers in 2026"
        headers={["", "Air-source (ASHP)", "Ground-source (GSHP)"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£18,000–£35,000"],
          ["BUS grant", "−£7,500", "−£7,500"],
          ["Net upfront cost", "£500–£6,500", "£10,500–£27,500"],
          ["SCOP (UK average)", "3.0–4.5", "4.0–5.5"],
          [
            "Annual running cost (3-bed semi)",
            "£900–£1,400",
            "£700–£1,100",
          ],
          ["Outdoor footprint", "1 m × 1 m unit", "Garden trench OR borehole"],
          ["Trench size (horizontal loop)", "—", "~600 m² of garden"],
          ["Borehole depth (vertical)", "—", "50–150 m"],
          ["Heat pump lifespan", "15–20 years", "20–25 years"],
          ["Ground loop lifespan", "—", "50+ years"],
          ["Install time", "2–3 days", "1–3 weeks (incl. ground works)"],
          ["Visible from street?", "Yes (outdoor unit)", "No (underground)"],
          ["Noise (1 m)", "40–50 dB(A)", "35–45 dB(A) (compressor indoors)"],
        ]}
        footnote="Ranges are typical 2026 UK figures. GSHP costs vary hugely by ground conditions — chalk + clay are cheap, rock is expensive."
      />

      <h2>What sets them apart, fundamentally</h2>
      <p>
        Both technologies use the same refrigerant-cycle principle:
        extract heat from a low-temperature source, compress it,
        deliver it to your radiators at 45–55°C. The difference is
        where the heat comes from. An air-source pump pulls heat from
        outside air via a fan unit on the side of the house. A
        ground-source pump pulls heat from a loop of fluid buried in
        the garden — either a horizontal trench at 1.5–2 m depth or a
        vertical borehole at 50–150 m.
      </p>
      <p>
        The ground stays at a stable 10–13°C year-round in the UK,
        while outside air swings from −5°C to +25°C. The stability is
        why ground-source units run more efficiently — they don&rsquo;t
        have to lift heat as far in mid-winter when air-source efficiency
        dips. SCOP (seasonal coefficient of performance) reflects this:
        ground-source units score 4–5.5 across a UK heating season vs
        3–4.5 for air-source.
      </p>

      <h2>The cost spread — and where it goes</h2>
      <p>
        The headline £10,000–£20,000 spread between ASHP and GSHP install
        costs comes almost entirely from ground works. The pump units
        themselves are similar price (£3,000–£6,000). What costs is:
        digging the trench (1–2 days with a mini-digger + reinstatement,
        £3,000–£8,000) OR drilling a borehole (1–4 days with a
        specialist rig, £5,000–£15,000 depending on geology). On top of
        that comes the loop itself (~£2,000–£5,000 of HDPE pipe + glycol
        antifreeze).
      </p>
      <p>
        Boreholes cost vary hugely by ground conditions. Chalk and clay
        drill fast and cheap. Hard sandstone or granite can quadruple
        the per-metre cost. A pre-install ground survey (£500–£1,500)
        is essential for any GSHP project — otherwise the borehole
        contractor&rsquo;s quote can swing by £10,000 between properties
        100 metres apart.
      </p>

      <h2>Running cost — GSHP wins, but by less than you&rsquo;d think</h2>
      <p>
        A SCOP-4.5 ground-source pump in a typical 3-bed semi uses
        about 2,700 kWh of electricity per year to deliver the same
        12,000 kWh of heat that an SCOP-3.5 air-source pump needs
        3,400 kWh for. At a heat-pump tariff of 18p/kWh, that&rsquo;s
        £486 vs £612 — £126/year saved. Over a 20-year lifespan that
        accumulates to £2,500 in present-value savings. The headline
        £10,000+ upfront cost difference means ground-source rarely
        pays back purely on running-cost terms; it pays back on
        comfort + lifespan + house resale.
      </p>

      <h2>Space requirements — the dealbreaker for most</h2>
      <p>
        Air-source needs a 1 m × 1 m outdoor spot for the fan unit,
        ideally on a north or east wall with 200 mm clearance for
        airflow. Almost every UK house has somewhere viable.
      </p>
      <p>
        Ground-source needs land:
      </p>
      <ul>
        <li>
          <strong>Horizontal loop</strong>: roughly 600 m² of garden
          available for a 1-week dig. Garden is reinstated but flat
          for the first growing season. Rules out terraces, most
          semis, almost all flats.
        </li>
        <li>
          <strong>Vertical borehole</strong>: 50–150 m deep,
          needs a 3 m × 5 m surface area for the drilling rig +
          drainage access. Possible on smaller plots. Requires
          local council notification + (for some areas) Environment
          Agency permission for boreholes near groundwater sources.
        </li>
      </ul>

      <h2>Who should pick which?</h2>
      <p>
        <strong>Choose air-source if:</strong> you have a typical UK
        property (terraced, semi-detached, modest garden, mains gas
        currently), reasonable insulation, and want the heat pump
        in within 2–3 months. About 95% of UK homes fit here.
      </p>
      <p>
        <strong>Choose ground-source if:</strong> you have a detached
        property with substantial garden or borehole feasibility,
        currently use oil or LPG (so your running cost benchmark
        starts high), and either plan to stay 10+ years OR are
        building new. GSHP&rsquo;s longer lifespan, quieter operation,
        and lower visual impact also matter on rural properties
        where the outdoor unit would look out of place.
      </p>

      <h2>Switching pathway</h2>
      <p>
        For air-source: run a pre-survey at{" "}
        <a href="/check">propertoasty.com/check</a> and you&rsquo;ll
        have an installer-ready report inside five minutes. For
        ground-source: that pre-survey is also useful, but you&rsquo;ll
        additionally need a ground survey (£500–£1,500) from a
        ground-source specialist installer. Most GSHP companies will
        run that survey as part of a quote process — don&rsquo;t pay
        for a standalone survey upfront unless the installer requires
        it.
      </p>

      <h2>Related reading</h2>
      <ul>
        <li>
          <a href="/guides/mcs-020-noise-rules-explained">
            MCS 020 noise rules explained
          </a>{" "}
          — only applies to air-source units; the most common
          reason a homeowner switches from ASHP to GSHP.
        </li>
        <li>
          <a href="/guides/mcs-site-visit-what-to-expect">
            MCS heat pump site visit: what to expect
          </a>{" "}
          — what installers measure during the 60–120 minute
          survey for either system.
        </li>
        <li>
          <a href="/guides/scop-cop-spf-explained">
            SCOP, COP, SPF explained
          </a>{" "}
          — GSHPs typically out-perform ASHPs on SCOP, but the
          numbers need comparing on like-for-like flow temp.
        </li>
      </ul>
    </AEOPage>
  );
}
