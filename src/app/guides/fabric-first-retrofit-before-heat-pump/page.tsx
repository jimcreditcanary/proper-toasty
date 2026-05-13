// /guides/fabric-first-retrofit-before-heat-pump — fabric-first guide.
//
// The "do the insulation first" guide. Heat pumps work best in
// homes with low heat-loss; fabric improvements before commissioning
// mean a smaller cheaper unit, lower flow temps, better COP. This
// guide ranks the measures by ROI for heat-pump readiness (not by
// raw kWh saved) — which is a slightly different ranking than the
// standard EPC recommendations.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/fabric-first-retrofit-before-heat-pump";

export const metadata: Metadata = {
  title: "Fabric-first retrofit before a heat pump: UK 2026 guide",
  description:
    "Which insulation measures actually matter before a heat pump install — ranked by ROI for heat-pump readiness, with UK 2026 costs and grants.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Fabric-first retrofit before a heat pump: UK 2026 guide",
    description:
      "Loft, cavity, glazing, draughtproofing — which to do first, what each costs, and when you can skip.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function FabricFirstRetrofit() {
  return (
    <AEOPage
      headline="Fabric-first retrofit before a heat pump: what to do, in what order, in UK 2026"
      description="Which insulation measures actually matter before a heat pump install — ranked by ROI for heat-pump readiness, with UK 2026 costs and grants."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Fabric-first retrofit"
      kind="howto"
      howToTotalTime="P3M"
      howToSteps={[
        {
          name: "Loft insulation top-up to 270mm",
          text: "Highest-ROI fabric measure. £400-£800 for a typical semi, cuts heat-loss 20-25% on pre-1990 stock. Mandatory for BUS if flagged on your EPC. Worth doing whether or not you fit a heat pump.",
        },
        {
          name: "Draughtproofing",
          text: "Most underrated measure. £200-£800, mostly DIY. Targets: door + window seals, loft hatch, unused chimneys, floorboard gaps, letterboxes, service penetrations. Cuts heat-loss 10-15%.",
        },
        {
          name: "Cavity wall insulation (if applicable)",
          text: "For 1930-1990 unfilled cavities. £1,500-£3,500, cuts heat-loss 25-30%. Non-destructive — bonded beads or mineral fibre blown into the cavity through small external mortar-joint holes. Mandatory for BUS if EPC flagged.",
        },
        {
          name: "Floor insulation",
          text: "For suspended timber floors over ventilated underfloor voids. £1,500-£4,000, cuts heat-loss 8-10%. Boards lifted or accessed from a cellar. Solid concrete floors usually not worth retrofitting.",
        },
        {
          name: "Solid-wall insulation (optional, expensive)",
          text: "For pre-1930 solid brick or stone walls. £8,000-£15,000 internal, £12,000-£25,000 external. Cuts heat-loss 30-40%. Major disruption. Use a PAS 2035 Retrofit Coordinator. Not required by BUS.",
        },
        {
          name: "Double or triple glazing (last)",
          text: "£6,000-£15,000 whole house. Surprisingly modest impact (10-15% heat-loss reduction) for the cost. Replace only if windows are failing — never as a heat-pump pre-step. Get a fresh EPC after the work to capture the rating improvement.",
        },
      ]}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "Fabric-first retrofit before a heat pump" },
      ]}
      directAnswer="Fabric-first means improving your home's insulation and airtightness BEFORE sizing a heat pump, because a heat pump is sized to your heat-loss number. Lower heat-loss means a smaller cheaper unit running at a lower flow temperature with a better COP and lower running cost. The right order in UK 2026 is: loft insulation top-up first, then draughtproofing, then cavity wall (if you have one), then floor insulation, with glazing and solid-wall insulation last because they cost the most for the least heat-loss reduction per pound."
      tldr={[
        "Heat pumps are sized to heat-loss, so insulation before sizing = smaller, cheaper unit.",
        "Priority order: loft → draughtproofing → cavity wall → floor → glazing.",
        "Loft top-up to 270mm costs £400–£800 and cuts heat-loss ~25% on a pre-1990 semi — best ROI by miles.",
        "BUS grant requires loft + cavity recommendations on your EPC to be cleared before claiming.",
        "Don't do glazing first — it's the worst £/kWh saved of the fabric measures and won't unlock BUS.",
        "ECO4 and Great British Insulation Scheme can fund insulation for eligible households.",
      ]}
      faqs={[
        {
          question:
            "Why does insulation matter so much before a heat pump?",
          answer:
            "A heat pump is sized to your home's heat-loss number (kW at design temperature). Higher heat-loss means a larger unit, higher flow temperature, lower coefficient of performance (COP), and higher running cost. Insulating first reduces the heat-loss number, which means a smaller and cheaper heat pump that can run at lower flow temps (35–45°C instead of 50–55°C). Every 5°C lower flow temperature is roughly 10–15% better COP. So fabric-first isn't just a green virtue — it directly lowers both the install cost and the annual electricity bill for the next 15+ years of the pump's life.",
        },
        {
          question:
            "What insulation work does the BUS grant actually require?",
          answer:
            "The 2024 BUS rules require any LOFT or CAVITY WALL recommendations on your current EPC to be cleared before the grant pays out. 'Cleared' means either the work is done (with a fresh EPC reflecting it) or a specific exemption applies (listed building, technical infeasibility, etc.). Other EPC recommendations — glazing, draughtproofing, solid-wall insulation, floor insulation — are NOT required for the grant. So you only HAVE to do loft and cavity if your EPC flagged them; everything else is optional fabric-first goodness for the heat-pump performance side.",
        },
        {
          question:
            "What's the right order to do fabric measures in?",
          answer:
            "Ranked by ROI for heat-pump readiness: (1) Loft insulation top-up to 270mm — £400–£800, cuts heat-loss ~20–25% on a pre-1990 semi; (2) Draughtproofing around doors, windows, loft hatches, floorboards — £200–£800 DIY-able, cuts heat-loss ~10–15%; (3) Cavity wall insulation if you have an unfilled cavity — £1,500–£3,500, cuts heat-loss ~25–30%; (4) Floor insulation under suspended timber floors — £1,500–£4,000, cuts heat-loss ~8–10%; (5) Solid-wall insulation internal or external — £8,000–£25,000, big impact (~30–40%) but expensive; (6) Double or triple glazing — £6,000–£15,000, surprisingly modest impact (~10–15%) for the cost. Glazing last unless the windows are failing anyway.",
        },
        {
          question:
            "Can I get grants to help pay for insulation?",
          answer:
            "Two main schemes in England as of May 2026: ECO4 (Energy Company Obligation) provides free or heavily-subsidised insulation for low-income households, those on means-tested benefits, or households where a member has a qualifying health condition. The Great British Insulation Scheme (GBIS) covers households in EPC bands D–G AND council tax bands A–D in England (A–E in Scotland). Both schemes are administered by energy suppliers — you apply via your supplier or via the ECO4 / GBIS portals at gov.uk. Wales uses the Nest scheme; Scotland uses Home Energy Scotland. None of these stack with the BUS grant directly, but doing your insulation under ECO4/GBIS BEFORE applying for BUS is the optimal sequence — you get free insulation, then the £7,500 heat pump grant separately.",
        },
        {
          question:
            "I have solid walls — should I insulate them before a heat pump?",
          answer:
            "Solid walls (typically pre-1930s houses without a cavity) are the trickiest case. The good news: heat pumps work fine in solid-wall houses; they just need to be sized correctly. The bad news: solid-wall insulation is the most expensive fabric measure (£8,000–£15,000 internal, £12,000–£25,000 external for a typical semi). Most UK installers will quote and install a heat pump for an uninsulated solid-wall property — they'll just specify a bigger unit and warn you about the running cost. If you can afford solid-wall insulation OR are doing it anyway for other reasons (replastering, extension, etc.), great. If not, get a heat pump quote for the solid-wall property as-is and decide from there. Solid-wall insulation is NOT required by the BUS grant.",
        },
        {
          question:
            "Can I skip fabric-first if my house is modern?",
          answer:
            "Yes — homes built to UK Building Regulations Part L 2013 or later (roughly post-2014 builds) typically have adequate insulation for a heat pump out of the box. Houses built to the 2022 Part L revision or the Future Homes Standard rolling in 2025 are designed with low-carbon heating in mind. If your home is post-2014, get a heat-loss survey done first; if the calculated heat-loss is reasonable (under ~8 kW for a typical 3-bed), there's probably nothing useful to do on the fabric side beyond draughtproofing. The fabric-first conversation is mainly for pre-1990 housing stock, which is the bulk of UK owner-occupied homes.",
        },
      ]}
      sources={[
        {
          name: "GOV.UK — Energy Company Obligation (ECO4)",
          url: "https://www.gov.uk/energy-company-obligation",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Great British Insulation Scheme",
          url: "https://www.gov.uk/apply-great-british-insulation-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Heat pump installation standard MIS 3005",
          url: "https://mcscertified.com/standards/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Home insulation guidance",
          url: "https://energysavingtrust.org.uk/advice/home-insulation/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The principle: heat pumps are sized to heat-loss</h2>
      <p>
        Every MCS heat-pump install starts with a heat-loss
        calculation under BS EN 12831 — a room-by-room model that
        tells the installer how many kilowatts your house needs
        at design temperature (typically &minus;3°C for most of
        England). That kW number directly determines:
      </p>
      <ul>
        <li>The size of the outdoor unit (and therefore its price).</li>
        <li>The flow temperature the system runs at day-to-day.</li>
        <li>Whether your existing radiators are large enough.</li>
        <li>The annual electricity bill, via the coefficient of performance.</li>
      </ul>
      <p>
        Insulating first lowers the heat-loss number. A lower
        number unlocks: smaller heat pump, lower flow temperature,
        better COP (often 3.5+ instead of 2.8), keeping more of
        your existing radiators. The bill saving from a better
        COP compounds over 15+ years — the lifetime of the heat
        pump — so fabric work pays back across the whole life
        of the system, not just the first winter.
      </p>

      <h2>The order: ROI ranking for heat-pump readiness</h2>
      <p>
        The standard EPC recommendation order isn&rsquo;t the
        same as the right order when your goal is heat-pump
        readiness. EPCs prioritise pure kWh saved; we&rsquo;re
        prioritising heat-loss reduction per pound spent. Here
        is the ranking for a typical UK pre-1990 home:
      </p>

      <h3>1. Loft insulation top-up to 270mm</h3>
      <p>
        <strong>Cost:</strong> £400–£800 for a typical semi.<br />
        <strong>Heat-loss reduction:</strong> 20–25% on pre-1990
        stock.<br />
        <strong>Disruption:</strong> One day, no decorating.<br />
        <strong>Required by BUS?</strong> Yes, if your EPC flagged it.
      </p>
      <p>
        Loft insulation is the highest-ROI fabric measure by
        miles. Going from 100mm to 270mm of mineral wool is
        cheap, fast, and dramatic. If your current EPC says
        &ldquo;loft insulation recommended&rdquo;, this is
        non-negotiable for BUS eligibility anyway. Worth doing
        whether or not you eventually install a heat pump.
      </p>

      <h3>2. Draughtproofing</h3>
      <p>
        <strong>Cost:</strong> £200–£800, mostly DIY-able.<br />
        <strong>Heat-loss reduction:</strong> 10–15%.<br />
        <strong>Disruption:</strong> Hours, not days.<br />
        <strong>Required by BUS?</strong> No.
      </p>
      <p>
        Draughtproofing is the most underrated fabric measure
        because it&rsquo;s cheap, fast, and surprisingly
        effective. Target: door + window seals, loft hatch,
        unused chimneys, floorboard gaps in older houses,
        letterboxes, service penetrations. A weekend with a
        tube of acrylic sealant and a few door brushes can shave
        more off your heat-loss than people expect. Many UK
        houses are leaky enough that draughtproofing matters
        more than glazing upgrades.
      </p>

      <h3>3. Cavity wall insulation</h3>
      <p>
        <strong>Cost:</strong> £1,500–£3,500 for a typical semi.<br />
        <strong>Heat-loss reduction:</strong> 25–30%.<br />
        <strong>Disruption:</strong> One day, minor external
        drill holes that get re-pointed.<br />
        <strong>Required by BUS?</strong> Yes, if your EPC flagged it.
      </p>
      <p>
        If your house was built between roughly 1930 and 1990
        with an unfilled cavity, this is huge. The work is
        non-destructive — bonded beads or mineral fibre blown
        into the cavity through small holes drilled in the
        external mortar joints. Most UK homes built post-1995
        already have insulated cavities. Check your EPC or get
        a borescope survey if unsure.
      </p>

      <h3>4. Floor insulation</h3>
      <p>
        <strong>Cost:</strong> £1,500–£4,000 typical.<br />
        <strong>Heat-loss reduction:</strong> 8–10%.<br />
        <strong>Disruption:</strong> Moderate — lifting boards
        or working from a cellar.<br />
        <strong>Required by BUS?</strong> No.
      </p>
      <p>
        Suspended timber floors over a ventilated underfloor
        void lose a surprising amount of heat. Insulating
        between the joists with mineral wool or PIR boards is
        moderately disruptive — boards have to come up, or
        access is from below if you have a cellar. Solid concrete
        floors are much harder to retrofit and usually not
        worth it.
      </p>

      <h3>5. Solid-wall insulation</h3>
      <p>
        <strong>Cost:</strong> £8,000–£15,000 internal, £12,000–£25,000 external.<br />
        <strong>Heat-loss reduction:</strong> 30–40%.<br />
        <strong>Disruption:</strong> Major.<br />
        <strong>Required by BUS?</strong> No.
      </p>
      <p>
        If your house is pre-1930 with solid brick or stone
        walls, this is where the heat is going. The impact is
        large but the cost is too — and it&rsquo;s only worth
        it if you can integrate it with other work
        (replastering, extension, re-rendering). A heat pump
        can absolutely work in a solid-wall house without this;
        you&rsquo;ll just have a bigger unit and higher running
        cost than an insulated equivalent.
      </p>

      <h3>6. Double or triple glazing</h3>
      <p>
        <strong>Cost:</strong> £6,000–£15,000 whole house.<br />
        <strong>Heat-loss reduction:</strong> 10–15%.<br />
        <strong>Disruption:</strong> Moderate — installer days.<br />
        <strong>Required by BUS?</strong> No.
      </p>
      <p>
        Glazing surprises people by being LAST on this list.
        It&rsquo;s the highest cost per percentage point of
        heat-loss reduction of any fabric measure. Replace
        glazing if the windows are failing (broken seals,
        rotted frames, single-glazing in cold rooms), not as a
        heat-pump pre-step. If your house already has decent
        double glazing, leave it alone.
      </p>

      <h2>Grants that can pay for the fabric work</h2>
      <p>
        Two main UK schemes in 2026 fund insulation work:
      </p>
      <ul>
        <li>
          <strong>ECO4 (Energy Company Obligation, 4th iteration).</strong>{" "}
          For low-income households, those on means-tested
          benefits, or households where a member has a qualifying
          health condition. Can cover loft, cavity, solid-wall
          insulation, and sometimes heating systems. Administered
          by your energy supplier — apply via the supplier or
          via gov.uk/energy-company-obligation.
        </li>
        <li>
          <strong>Great British Insulation Scheme (GBIS).</strong>{" "}
          For households in EPC bands D–G AND council tax bands
          A–D (England) or A–E (Scotland). Covers loft and
          cavity primarily; some suppliers also cover solid-wall.
          Apply at gov.uk/apply-great-british-insulation-scheme.
        </li>
        <li>
          <strong>Nest (Wales)</strong> and{" "}
          <strong>Home Energy Scotland</strong> are the
          devolved-nation equivalents with similar but distinct
          eligibility rules.
        </li>
      </ul>
      <p>
        None of these stack with BUS on the same property —
        you can&rsquo;t double-claim a single piece of work —
        but the sequence is straightforward: do insulation
        under ECO4/GBIS first, then apply for BUS for the heat
        pump. The insulation work also clears any blocking
        EPC recommendations.
      </p>

      <h2>Common mistakes — and how to avoid them</h2>
      <ul>
        <li>
          <strong>Doing glazing first.</strong> Glazing is the
          worst £/heat-loss-reduction of the fabric measures.
          Do it last unless the windows are failing.
        </li>
        <li>
          <strong>Skipping draughtproofing.</strong> It&rsquo;s
          cheap enough to be invisible in the budget but
          contributes 10–15% on most pre-1990 houses. Worth a
          weekend.
        </li>
        <li>
          <strong>Solid-wall insulation without ventilation
          planning.</strong> Adding insulation to a solid wall
          changes the moisture profile. Vapour barriers,
          breathable membranes, and PIV or MVHR ventilation may
          be needed. Use a Retrofit Coordinator under PAS 2035
          for any solid-wall work; this is non-negotiable.
        </li>
        <li>
          <strong>Not getting a fresh EPC after the work.</strong>{" "}
          If you insulated to clear a BUS-blocking
          recommendation, you need a NEW EPC reflecting the
          completed work — not the old one. Fresh EPC: £60–£120,
          1–2 weeks.
        </li>
        <li>
          <strong>Doing fabric work AFTER the heat pump.</strong>{" "}
          If you insulate after the pump is installed, the
          pump is oversized for the new heat-loss. It&rsquo;ll
          short-cycle in mild weather, costing more and wearing
          faster. Always do fabric BEFORE sizing.
        </li>
      </ul>

      <h2>Realistic timeline if you&rsquo;re starting now</h2>
      <p>
        For a typical UK semi where loft + cavity are flagged
        on the EPC and the homeowner wants a heat pump:
      </p>
      <ul>
        <li>
          <strong>Week 0:</strong> Check ECO4/GBIS eligibility.
          Order loft + cavity quotes (or apply via energy
          supplier if eligible).
        </li>
        <li>
          <strong>Weeks 1–4:</strong> Loft + cavity installed.
          Draughtproofing done in parallel.
        </li>
        <li>
          <strong>Week 4:</strong> Fresh EPC commissioned.
        </li>
        <li>
          <strong>Weeks 5–6:</strong> Fresh EPC issued, showing
          the work completed and recommendations cleared.
        </li>
        <li>
          <strong>Weeks 6–8:</strong> Request MCS heat-pump
          quotes. Installers will size to the NEW heat-loss
          number (lower than before).
        </li>
        <li>
          <strong>Weeks 8–14:</strong> Install + commissioning
          + BUS claim, per the{" "}
          <a href="/guides/bus-application-walkthrough">BUS application walkthrough</a>.
        </li>
      </ul>
      <p>
        End-to-end: 3–4 months from starting fabric work to a
        commissioned heat pump. Compress to 6–8 weeks if you
        have no insulation work to do.
      </p>

      <h2>Where Propertoasty fits</h2>
      <p>
        The free pre-survey at{" "}
        <a href="/check">propertoasty.com/check</a> pulls your
        EPC, flags any uncleared recommendations, and indicates
        heat-loss for your property based on EPC + floor area.
        Run it BEFORE doing any fabric work to see the starting
        point; run it again after work to see the new heat-loss
        figure that installers will quote against.
      </p>

      <h2>The summary</h2>
      <p>
        Fabric-first works because heat pumps are sized to
        heat-loss, and heat-loss is what insulation reduces.
        The right order in UK 2026 is loft top-up, then
        draughtproofing, then cavity wall, then floor, with
        solid-wall and glazing last. Loft + cavity are also the
        only two BUS-blocking EPC items, so they pull double
        duty. Use ECO4 or GBIS if eligible to fund the work,
        get a fresh EPC after the work is done, then quote the
        heat pump against the new (lower) heat-loss number.
        Don&rsquo;t do the heat pump first and the fabric work
        after — you&rsquo;ll end up with an oversized system
        that cycles inefficiently.
      </p>
    </AEOPage>
  );
}
