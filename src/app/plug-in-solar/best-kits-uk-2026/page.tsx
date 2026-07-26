// /plug-in-solar/best-kits-uk-2026 — the affiliate money page.
//
// Ranks intent-heavy queries ("best plug in solar UK", "plug in
// solar kit review", "Anker vs EcoFlow balcony solar UK"). Each
// kit block has a direct Amazon UK affiliate link with the
// propertoasty-21 tag. Direct-brand links (Anker UK, EcoFlow UK)
// are also embedded where available since some readers prefer
// buying direct.
//
// Voice: same plainer-English pass used on the hub — call out
// specs but always with a plain-English gloss. "800 W AC output"
// stays "800 watts pushed into your home", "MPPT" becomes "the
// bit that squeezes the most out of the panel", etc.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { PlugInSolarCalculator } from "@/components/plug-in-solar/calculator";

const URL =
  "https://www.propertoasty.com/plug-in-solar/best-kits-uk-2026";

const AMAZON_TAG = "propertoasty-21";
const amz = (asin: string) =>
  `https://www.amazon.co.uk/dp/${asin}?tag=${AMAZON_TAG}`;

export const metadata: Metadata = {
  title: "Best plug-in solar kits UK 2026: EcoFlow STREAM + DIY picks",
  description:
    "Which plug-in solar kit to buy on Amazon UK. EcoFlow STREAM (complete + battery-included) vs the Solarsys DIY inverter, ranked on price, output, mounting, and warranty.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Best plug-in solar kits UK 2026: EcoFlow STREAM + DIY picks",
    description:
      "The real Amazon UK plug-in solar lineup: EcoFlow STREAM complete kits and the Solarsys DIY inverter — with the specs that actually matter.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
  },
};

export default function PlugInSolarBestKits() {
  return (
    <AEOPage
      headline="Best plug-in solar kits in the UK: 2026 picks"
      description="Anker SOLIX vs EcoFlow STREAM vs Amazon budget kits — how they stack up on price, output, mounting, warranty, and how easy they are to actually get running."
      url={URL}
      image="/hero-solar.jpg"
      datePublished="2026-07-26"
      dateModified="2026-07-26"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Plug-in solar"
      kind="article"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Plug-in solar", url: "/plug-in-solar" },
        { name: "Best kits UK 2026" },
      ]}
      related={[
        {
          href: "/plug-in-solar",
          eyebrow: "Hub",
          title: "Plug-in solar UK: the full guide",
          body: "Cost, legality, payback, and who plug-in solar is actually a good fit for.",
        },
        {
          href: "/plug-in-solar/legal-uk",
          eyebrow: "Guide",
          title: "Is plug-in solar legal in the UK?",
          body: "What changed in April 2026, the 800 watt rule, and the one-page form you have to post.",
        },
        {
          href: "/plug-in-solar/for-renters",
          eyebrow: "Guide",
          title: "Plug-in solar for renters",
          body: "How to install without drilling, what your tenancy actually says, and how the kit moves with you.",
        },
      ]}
      directAnswer="For most UK homeowners buying a plug-in solar kit in 2026, the EcoFlow STREAM Balcony Solar with brackets (£499 on Amazon UK) is the best pick — complete two-panel kit, 800 watt inverter, balcony rail mounts included, UK three-pin plug, on the UK's tested-equipment register. If you want home storage from day one, step up to the EcoFlow STREAM Max with battery (£949). For a DIY starter under £400, the Solarsys 800W micro-inverter (£149) plus two budget panels is the cheapest legit way in. EcoFlow dominates UK plug-in solar Amazon listings today; Anker's Balkonkraftwerk kits are widely available in Germany but haven't landed on Amazon UK yet."
      tldr={[
        "Best pick: EcoFlow STREAM Balcony Solar + brackets — £499, complete kit, mounts included.",
        "Same kit without brackets: £449 (source your own mount if you have specific balcony requirements).",
        "With battery: EcoFlow STREAM Max — £949, adds 1.92kWh of storage for evening use.",
        "Cheapest DIY: Solarsys 800W inverter — £149, add two budget panels for ~£400 total.",
        "Skip: anything with a Schuko (German) plug, anything over 800 watts of output, anything not on the UK tested-equipment register.",
      ]}
      faqs={[
        {
          question: "Which plug-in solar kit is best in the UK for 2026?",
          answer:
            "For most UK homeowners the EcoFlow STREAM Balcony Solar (with brackets, £499 on Amazon UK) is the best pick — a complete kit with two 400 watt panels, an 800 watt inverter, balcony rail mounts, and a UK three-pin plug. EcoFlow dominates the UK Amazon listings today. If you want home storage on day one, step up to the STREAM Max with battery (£949). If you're happy sourcing panels yourself, the Solarsys 800W micro-inverter alone (£149) plus two budget panels comes in around £400 total.",
        },
        {
          question: "How much should I spend on a plug-in solar kit?",
          answer:
            "Around £600 to £900 for most people. Under £500 gets you a single-panel kit that only covers your standby usage — worth it if you're testing the waters or you only have a small south-facing space. Over £1,000 usually means you're paying for battery storage on top, which isn't part of the plug-in scope but often gets bundled.",
        },
        {
          question: "Are cheap Amazon plug-in solar kits any good?",
          answer:
            "The £400 to £600 Amazon kits work fine electrically, but check the listing (or box) confirms the kit is on the UK's tested-equipment register. Some older stock predates the register and won't be legal to plug in after 27 August 2026. Warranty claims tend to be harder — generic sellers don't have a UK service network, so if the inverter dies in year 2, you're often on your own.",
        },
        {
          question: "Complete kit vs DIY — which one?",
          answer:
            "The EcoFlow STREAM complete kits (£449-£499) are for people who want to open the box, hang the panels, plug in, and be done. The Solarsys DIY inverter (£149 + your own panels ≈ £400 total) is for people happy to source second-hand or budget panels and match them up themselves. Same electrical output either way; the £100 or so difference is buying you a matched, warrantied bundle vs some assembly required.",
        },
        {
          question: "What size panel should I get?",
          answer:
            "Two panels around 430 to 450 watts each is the sweet spot for a UK 800 watt kit. That gives you 860-900 watts of panel capacity feeding a 800 watt cap, which means on cloudy days you're closer to the cap than you would be with a single 800 watt panel. One-panel kits are cheaper but generate meaningfully less over the year.",
        },
        {
          question: "Do I need a special socket for a plug-in solar kit?",
          answer:
            "No — any standard UK three-pin socket works. What matters is that the socket is on its own circuit (not sharing with a high-load appliance like a washing machine on the same fuse). Most modern homes have separate circuits for downstairs and upstairs sockets, so this is usually fine. If you're not sure, an electrician can check in 10 minutes.",
        },
        {
          question: "Can I install a plug-in solar kit myself?",
          answer:
            "Yes — that's the whole point of plug-in solar. Mount the panel (balcony rail, wall bracket, or ground frame), connect the cable to the inverter box, plug the inverter into a standard socket. Then post the notification form to your network operator within 28 days. No electrician required for the plug-in itself; only get one involved if you want to add an outdoor socket for the kit.",
        },
        {
          question: "How long do plug-in solar kits last?",
          answer:
            "Panels are typically warrantied for 20 to 25 years and rarely fail — they degrade gradually, losing about 0.5% output a year. The inverter (the box between the panel and the socket) is the weak point, typically warrantied 10 to 12 years but often dies in years 8 to 15. When it does, you replace just the inverter (£150 to £300), not the whole kit.",
        },
      ]}
      sources={[
        {
          name: "Anker SOLIX UK — official product page",
          url: "https://www.anker.com/uk",
          accessedDate: "July 2026",
        },
        {
          name: "EcoFlow UK — official product page",
          url: "https://uk.ecoflow.com/",
          accessedDate: "July 2026",
        },
        {
          name: "Energy Networks Association — tested-equipment register",
          url: "https://www.energynetworks.org/industry-hub/resource-library/g98-forms",
          accessedDate: "July 2026",
        },
        {
          name: "Amazon UK — plug-in solar kit category",
          url: "https://www.amazon.co.uk/s?k=plug+in+solar+kit",
          accessedDate: "July 2026",
        },
      ]}
    >
      {/* Calculator up top — this IS the money page, so give
          buyers a payback figure for their situation before they
          read a single word of the review. */}
      <PlugInSolarCalculator />

      <h2>How to pick the right one</h2>
      <p>
        Five things separate a good UK plug-in solar kit from a
        bad one in 2026. Everything else is marketing.
      </p>
      <ol>
        <li>
          <strong>On the UK tested-equipment register.</strong> After
          27 August 2026, kits sold in the UK legally have to be on
          a public register showing they&rsquo;ve passed safety
          tests. Some older Amazon stock predates the register.
          Check the listing or box before buying.
        </li>
        <li>
          <strong>UK three-pin plug.</strong> German kits often ship
          with a Schuko (Type F) plug, which won&rsquo;t fit a UK
          socket. Either buy a UK-plug version or budget for a
          proper adaptor (not a travel adaptor — a fused conversion
          plug).
        </li>
        <li>
          <strong>Total panel capacity 800 to 900 watts.</strong>{" "}
          You want slightly more panel than the 800 watt output cap
          so you&rsquo;re closer to the cap in cloudy conditions.
          Two panels of 430 to 450 watts is ideal.
        </li>
        <li>
          <strong>Mount that fits your space.</strong> Balcony rail
          mount for most flats (no drilling required), wall bracket
          for a garden wall, ground frame for a small garden or
          patio. Most kits ship with one mount type — check.
        </li>
        <li>
          <strong>UK warranty support.</strong> Anker and EcoFlow
          both have real UK service networks. Generic Amazon brands
          usually don&rsquo;t — if the inverter dies in year 2, you
          may be shipping it to China.
        </li>
      </ol>

      <h2 id="ecoflow-stream-2x400">1. EcoFlow STREAM Balcony Solar — £449 (best value complete kit)</h2>
      <p>
        <a
          href={amz("B0F1CVD47Z")}
          target="_blank"
          rel="noopener sponsored"
        >
          Buy on Amazon UK →
        </a>{" "}
        or{" "}
        <a
          href="https://uk.ecoflow.com/"
          target="_blank"
          rel="noopener sponsored"
        >
          direct from EcoFlow UK
        </a>
      </p>
      <p>
        Two 400 watt solar panels, an 800 watt weather-sealed
        inverter with Wi-Fi + app control, cables, and a UK
        three-pin plug. Adds up to the sweet spot capacity most
        UK homes want: 800 watts pushed into your home, from
        panels that comfortably clear that cap on cloudier days.
      </p>
      <p>
        This is the pragmatic pick for most UK homeowners in
        2026. EcoFlow is the real market leader for UK plug-in
        solar right now — the only brand with proper UK Amazon
        stock of a complete kit at this price point. Their app
        is polished, warranty support runs through EcoFlow UK
        direct, and the kit is on the UK&rsquo;s tested-equipment
        register.
      </p>
      <p>
        Watch for: the base kit ships without a balcony mount.
        If you&rsquo;re installing on a metal balcony rail,
        upgrade to the &ldquo;with brackets&rdquo; version below
        (£50 more, saves you sourcing mounts separately).
      </p>
      <p>
        Payback at south-facing average UK sun: 2 to 3 years for
        someone home during the day.
      </p>

      <h2 id="ecoflow-stream-2x400-brackets">2. EcoFlow STREAM Balcony Solar + brackets — £499</h2>
      <p>
        <a
          href={amz("B0F1D53MXZ")}
          target="_blank"
          rel="noopener sponsored"
        >
          Buy on Amazon UK →
        </a>
      </p>
      <p>
        Same as the flagship kit above but ships with two
        adjustable balcony-rail brackets included. £50 more but
        it saves you £30-£50 on separate mounts + the hassle of
        finding brackets that fit your specific rail. If your
        balcony has a standard metal railing, this is the
        one-click buy.
      </p>
      <p>
        The brackets adjust for angle, so you can tilt the panels
        toward the sun rather than mounting them flush to the
        rail (about 15% more generation over the year on a
        south-facing balcony).
      </p>

      <h2 id="ecoflow-stream-max-battery">3. EcoFlow STREAM Max with battery — £949 (best for adding storage)</h2>
      <p>
        <a
          href={amz("B0FDK6VGNZ")}
          target="_blank"
          rel="noopener sponsored"
        >
          Buy on Amazon UK →
        </a>
      </p>
      <p>
        Same 800 watt inverter + two 400 watt panels as above,
        plus a 1.92 kWh home battery in one integrated package.
        The battery stores your daytime solar for use in the
        evening, which lifts self-consumption from around 60% to
        90% — pretty much every unit the panels generate ends up
        offsetting a unit you&rsquo;d otherwise buy from the grid.
      </p>
      <p>
        Worth the extra £500 over the plain kit if you&rsquo;re out
        of the house during the day. Marginal for households
        already home in the day (the plain kit already captures
        most of what it generates).
      </p>
      <p>
        Payback at south-facing average UK sun: 3.5 to 5 years.
      </p>

      <h2 id="solarsys-800w-diy">4. Solarsys 800W micro-inverter — £149 (DIY starter)</h2>
      <p>
        <a
          href={amz("B0H4Z3D1N9")}
          target="_blank"
          rel="noopener sponsored"
        >
          Buy on Amazon UK →
        </a>
      </p>
      <p>
        Just the inverter — no panels. Pair with two 300-550 watt
        second-hand or budget solar panels (roughly £250 for a
        matched pair on Amazon UK or eBay) for a fully-built kit
        at around £400 total. Cheapest way in if you&rsquo;re
        happy sourcing panels yourself.
      </p>
      <p>
        Comes with a 3m AC cable and UK 13A plug pre-fitted,
        dual-MPPT for uneven-shading panels, on the UK&rsquo;s
        tested-equipment register. Warranty is thinner than
        EcoFlow&rsquo;s but everything you actually need is
        included. Suits people who&rsquo;ve done a bit of DIY
        electrical work before.
      </p>
      <p>
        Two things to check before you buy any Amazon plug-in
        solar kit:
      </p>
      <ul>
        <li>
          <strong>The listing (or box) confirms the kit is on the
          UK&rsquo;s tested-equipment register.</strong> After 27
          August 2026, kits without this listing can&rsquo;t
          legally be sold or plugged in. Some older stock is
          still on the shelves.
        </li>
        <li>
          <strong>The plug is UK-standard three-pin,</strong>{" "}
          not Schuko (Type F). Amazon EU listings sometimes cross-
          list German stock — check the photo of the actual plug.
        </li>
      </ul>
      <p>
        Payback: 2.5 to 4 years south-facing (the shorter payback
        reflects the lower upfront cost — panels are the same, so
        annual generation is similar).
      </p>

      <h2>What about batteries?</h2>
      <p>
        Batteries sit outside the plug-in solar rules — the UK
        law explicitly leaves them out of the 800 watt scope. So
        no plug-in kit in the UK ships with a battery built in.
        What you can do is buy a portable power station separately
        (Anker SOLIX C1000 at £700, EcoFlow River 3 at £600, Bluetti
        AC180 at £900) and charge it from the plug-in kit during
        the day, then use it to power devices in the evening.
      </p>
      <p>
        Whether this is worth doing depends on when you&rsquo;re
        home. If someone&rsquo;s at home during the day using
        electricity, the plug-in kit already feeds them directly
        — a battery adds cost without adding much saving. If
        you&rsquo;re out all day and the electricity would
        otherwise be wasted, a battery captures that and lets you
        use it in the evening. Rough rule: households with a
        battery capture 30-40% more of what the kit generates.
      </p>

      <h2>Mounting: match the mount to your setup</h2>
      <p>
        Same panels, three main mounting options depending on where
        you&rsquo;re putting them:
      </p>
      <ul>
        <li>
          <strong>Balcony rail mount.</strong> For flats and any
          balcony with a metal railing. Panels hang on the outside
          of the rail (facing outward) or above it (angled up).
          No drilling. Anker and EcoFlow both ship this by default.
        </li>
        <li>
          <strong>Wall bracket.</strong> For a garden wall,
          fence, or south-facing house wall. Requires drilling
          into the wall. Not renter-friendly. Usually a £30 to
          £50 add-on from the kit maker or a third party.
        </li>
        <li>
          <strong>Ground frame.</strong> For a small garden,
          patio, or flat roof. Sits on the ground weighted down
          with a couple of paving slabs. No drilling but takes
          up floor space. Add-on frame around £60 to £100.
        </li>
      </ul>

      <h2>The bottom line</h2>
      <p>
        For most UK homes without a battery in the plan, the{" "}
        <a
          href={amz("B0F1D53MXZ")}
          target="_blank"
          rel="noopener sponsored"
        >
          EcoFlow STREAM Balcony Solar with brackets (£499)
        </a>{" "}
        is the pragmatic pick — complete kit, mounts included, on
        the UK tested-equipment register, warranty backed by
        EcoFlow UK. If you want storage from day one, step up to
        the{" "}
        <a
          href={amz("B0FDK6VGNZ")}
          target="_blank"
          rel="noopener sponsored"
        >
          EcoFlow STREAM Max with battery (£949)
        </a>
        . For a DIY starter under £400, the{" "}
        <a
          href={amz("B0H4Z3D1N9")}
          target="_blank"
          rel="noopener sponsored"
        >
          Solarsys micro-inverter (£149)
        </a>{" "}
        plus two budget panels is the cheapest legit route in.
      </p>
      <p>
        For the full context on how plug-in solar works, the
        payback maths, and the one-page notification form you
        need to post,{" "}
        <a href="/plug-in-solar">
          start with the UK plug-in solar guide
        </a>
        .
      </p>
    </AEOPage>
  );
}
